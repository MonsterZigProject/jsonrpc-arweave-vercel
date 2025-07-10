import Bundlr from '@bundlr-network/client';
import { fromBuffer } from 'file-type';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { method, params } = req.body;

    if (method === 'uploadToArweave') {
      const { privateKey, fileData } = params;
      if (!privateKey || !fileData) {
        return res.status(400).json({ error: "Missing privateKey or fileData" });
      }

      const buffer = Buffer.from(fileData, 'base64');
      let detectedType = await fromBuffer(buffer);
      let contentType = detectedType ? detectedType.mime : 'application/octet-stream';

      const bundlr = new Bundlr.default('https://node1.bundlr.network', 'matic', privateKey);
      const tx = await bundlr.upload(buffer, {
        tags: [{ name: "Content-Type", value: contentType }]
      });

      return res.status(200).json({
        result: `https://arweave.net/${tx.id}`,
        contentType
      });
    }

    return res.status(400).json({ error: "Unknown method" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
