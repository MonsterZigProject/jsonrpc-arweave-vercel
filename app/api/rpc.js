export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { jsonrpc, method, params, id } = req.body;

  if (jsonrpc !== '2.0' || !method || typeof id === 'undefined') {
    return res.status(400).json({
      jsonrpc: '2.0',
      error: { code: -32600, message: 'Invalid Request' },
      id: null
    });
  }

  try {
    let result;
    switch (method) {
      case 'ping':
        result = 'pong';
        break;
      case 'sum':
        result = (params?.a || 0) + (params?.b || 0);
        break;
      default:
        return res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32601, message: 'Method not found' },
          id
        });
    }

    return res.json({ jsonrpc: '2.0', result, id });

  } catch (err) {
    return res.status(500).json({
      jsonrpc: '2.0',
      error: { code: -32603, message: 'Internal error' },
      id
    });
  }
}
