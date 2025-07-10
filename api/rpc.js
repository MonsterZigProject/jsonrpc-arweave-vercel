import Bundlr from '@bundlr-network/client';

export default async function handler(req, res) {
  const FileType = await import('file-type');

  if (req.method !== 'POST') return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { method, params } = req.body;

    if (method === 'uploadToArweave') {
      const { privateKey, fileData } = params;
      if (!privateKey || !fileData) {
        return res.status(400).json({ error: "Missing privateKey or fileData" });
      }

      const buffer = Buffer.from(fileData, 'base64');
      const detectedType = await FileType.fileTypeFromBuffer(buffer);
      const contentType = detectedType ? detectedType.mime : 'application/octet-stream';

      const bundlr = new Bundlr.default('https://node1.bundlr.network', 'matic', privateKey);

      try {
        const tx = await bundlr.upload(buffer, {
          tags: [{ name: "Content-Type", value: contentType }]
        });

        return res.status(200).json({
          result: `https://arweave.net/${tx.id}`,
          contentType
        });

      } catch (err) {
        console.error("Bundlr error:", err);
        return res.status(500).json({ error: err.message || "Upload failed" });
      }
    }

    return res.status(400).json({ error: "Unknown method" });

  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
