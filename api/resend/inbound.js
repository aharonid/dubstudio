import { Resend } from 'resend';

export const config = {
  api: {
    bodyParser: false,
  },
};

const DEFAULT_FORWARD_ADDRESSES = ['info@dubstudio.com'];
const DEFAULT_FORWARD_FROM = 'DubStudio <info@dubstudio.com>';

function sendJson(response, status, body) {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(body));
}

function normalizeEmail(value) {
  const bracketMatch = value.match(/<([^>]+)>/);
  return (bracketMatch?.[1] ?? value).trim().toLowerCase();
}

function parseAddressList(value) {
  return (value ? value.split(',') : DEFAULT_FORWARD_ADDRESSES)
    .map(normalizeEmail)
    .filter(Boolean);
}

function emailAddress(value) {
  if (typeof value === 'string') return normalizeEmail(value);

  if (value && typeof value === 'object') {
    if ('email' in value && typeof value.email === 'string') {
      return normalizeEmail(value.email);
    }

    if ('address' in value && typeof value.address === 'string') {
      return normalizeEmail(value.address);
    }
  }

  return '';
}

function eventRecipients(event) {
  return [
    ...(event.data?.to ?? []),
    ...(event.data?.cc ?? []),
    ...(event.data?.bcc ?? []),
  ]
    .map(emailAddress)
    .filter(Boolean);
}

async function readRawBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(request, response) {
  if (request.method === 'GET') {
    return sendJson(response, 200, {
      ok: true,
      route: 'resend-inbound',
    });
  }

  if (request.method !== 'POST') {
    response.setHeader('allow', 'GET, POST');
    return sendJson(response, 405, { error: 'Method not allowed.' });
  }

  const apiKey = process.env.RESEND_API_KEY || process.env.resendkey;
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  const forwardTo = process.env.INBOUND_FORWARD_TO_EMAIL;
  const forwardFrom = process.env.INBOUND_FORWARD_FROM_EMAIL || DEFAULT_FORWARD_FROM;
  const forwardAddresses = parseAddressList(process.env.INBOUND_FORWARD_ADDRESSES);

  if (!apiKey || !webhookSecret || !forwardTo) {
    return sendJson(response, 503, { error: 'Inbound email routing is not configured.' });
  }

  const forwardDestinations = parseAddressList(forwardTo);
  if (forwardDestinations.some((destination) => forwardAddresses.includes(destination))) {
    return sendJson(response, 500, { error: 'Inbound forwarding destination would create a loop.' });
  }

  const resend = new Resend(apiKey);
  const payload = await readRawBody(request);

  let event;

  try {
    event = resend.webhooks.verify({
      payload,
      headers: {
        id: request.headers['svix-id'] || '',
        timestamp: request.headers['svix-timestamp'] || '',
        signature: request.headers['svix-signature'] || '',
      },
      webhookSecret,
    });
  } catch {
    return sendJson(response, 400, { error: 'Invalid webhook signature.' });
  }

  if (event.type !== 'email.received' || !event.data?.email_id) {
    return sendJson(response, 200, { ok: true, ignored: true });
  }

  const shouldForward = eventRecipients(event).some((recipient) =>
    forwardAddresses.includes(recipient)
  );

  if (!shouldForward) {
    return sendJson(response, 200, { ok: true, ignored: true });
  }

  const { data, error } = await resend.emails.receiving.forward({
    emailId: event.data.email_id,
    to: forwardTo,
    from: forwardFrom,
  });

  if (error) {
    console.error('Resend inbound forwarding failed:', error);
    return sendJson(response, 502, { error: 'Inbound email forwarding failed.' });
  }

  return sendJson(response, 200, { ok: true, id: data?.id });
}
