import Bundlr from '@bundlr-network/client';

export default async function handler(req, res) {
  const FileType = await import('file-type');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { method, params } = req.body;

    if (method === 'uploadToArweave') {
      const { privateKey, fileData } = params;
      if (!privateKey || !fileData) {
        return res.status(400).json({ error: "Missing privateKey or fileData" });
      }

      // decode file
      const buffer = Buffer.from(fileData, 'base64');
      const detectedType = await FileType.fileTypeFromBuffer(buffer);
      const contentType = detectedType ? detectedType.mime : 'application/octet-stream';

      // init bundlr
      const bundlr = new Bundlr('https://node1.bundlr.network', 'matic', privateKey);

      // cek balance on bundlr
      const balance = await bundlr.getLoadedBalance();
      console.log(`Bundlr loaded balance: ${balance.toString()}`);

      // jika balance bundlr rendah, auto fund
      if (Number(balance) < 1000000) { // kurang dari 0.001 MATIC
        console.log("Low Bundlr balance, funding with 0.001 MATIC...");
        const fundTx = await bundlr.fund(1000000); // fund 0.001 MATIC
        console.log("Funded:", fundTx.id);
      }

      // upload to arweave
      const tx = await bundlr.upload(buffer, {
        tags: [{ name: "Content-Type", value: contentType }]
      });

      console.log(`Uploaded to Arweave: https://arweave.net/${tx.id}`);

      return res.status(200).json({
        result: `https://arweave.net/${tx.id}`,
        contentType
      });
    }

    return res.status(400).json({ error: "Unknown method" });

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
