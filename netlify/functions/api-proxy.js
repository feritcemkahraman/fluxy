// Netlify Function - Backend Proxy
// Bu function VDS backend'e istek yönlendirir (HTTPS sorununu çözer)

const fetch = require('node-fetch');

const VDS_BACKEND_URL = 'http://87.121.103.236:5000';

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  // OPTIONS (preflight) request için
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    // Path'i al (örn: /.netlify/functions/api-proxy/auth/login -> /auth/login)
    const path = event.path.replace('/.netlify/functions/api-proxy', '');
    const url = `${VDS_BACKEND_URL}/api${path}`;

    // Query string ekle
    const queryString = event.rawQuery ? `?${event.rawQuery}` : '';
    const fullUrl = `${url}${queryString}`;

    console.log('Proxying request to:', fullUrl);

    // Request options
    const options = {
      method: event.httpMethod,
      headers: {
        'Content-Type': 'application/json',
        ...event.headers,
      },
    };

    // Body ekle (POST, PUT için)
    if (event.body && (event.httpMethod === 'POST' || event.httpMethod === 'PUT' || event.httpMethod === 'PATCH')) {
      options.body = event.body;
    }

    // Backend'e istek at
    const response = await fetch(fullUrl, options);
    const data = await response.text();

    return {
      statusCode: response.status,
      headers: {
        ...headers,
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
      body: data,
    };
  } catch (error) {
    console.error('Proxy error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Proxy error',
        message: error.message,
      }),
    };
  }
};
