exports.handler = async (event, context) => {
  console.log('Test function called');
  console.log('Environment variables check:', {
    NODE_ENV: process.env.NODE_ENV,
    MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT_SET',
    JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT_SET'
  });

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      message: 'Test endpoint working',
      timestamp: new Date().toISOString(),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT_SET',
        JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT_SET'
      }
    })
  };
};