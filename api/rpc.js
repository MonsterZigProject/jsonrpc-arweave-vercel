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

      // cek bundlr balance
      let bundlrBalance = await bundlr.getLoadedBalance();
      console.log("Bundlr loaded balance:", bundlr.utils.unitConverter(bundlrBalance).toString(), "MATIC");

      // auto fund jika balance rendah
      if (bundlrBalance < 1000000) {
        console.log("Low bundlr balance, funding with 0.001 MATIC...");
        const fundTx = await bundlr.fund(1000000);
        console.log("Fund tx id:", fundTx.id);

        // update balance
        bundlrBalance = await bundlr.getLoadedBalance();
        console.log("New bundlr balance:", bundlr.utils.unitConverter(bundlrBalance).toString(), "MATIC");
      }

      // create, sign, upload transaction
      const tx = bundlr.createTransaction(buffer, {
        tags: [{ name: "Content-Type", value: contentType }]
      });
      await tx.sign();
      const response = await tx.upload();

      console.log("Upload status:", response.status);

      return res.status(200).json({
        result: `https://arweave.net/${tx.id}`,
        contentType,
        status: response.status
      });
    }

    return res.status(400).json({ error: "Unknown method" });

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
