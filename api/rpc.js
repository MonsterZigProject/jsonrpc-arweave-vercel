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
      console.log("Wallet address:", bundlr.address);

      // cek saldo on-chain
      const onChainBalance = await bundlr.getBalance(bundlr.address);
      console.log("On-chain MATIC balance:", bundlr.utils.unitConverter(onChainBalance).toString(), "MATIC");

      // cek bundlr loaded balance
      let bundlrBalance = await bundlr.getLoadedBalance();
      console.log("Bundlr loaded balance:", bundlr.utils.unitConverter(bundlrBalance).toString(), "MATIC");

      // auto fund bundlr jika perlu
      if (bundlrBalance < 1000000) {
        console.log("Low bundlr balance, funding with 0.001 MATIC...");
        const fundTx = await bundlr.fund(1000000);
        console.log("Fund tx id:", fundTx.id);

        // update bundlr balance
        bundlrBalance = await bundlr.getLoadedBalance();
        console.log("New bundlr balance:", bundlr.utils.unitConverter(bundlrBalance).toString(), "MATIC");
      }

      // upload ke arweave
      const tx = await bundlr.upload(buffer, {
        tags: [{ name: "Content-Type", value: contentType }]
      });
      console.log(`✅ Uploaded to Arweave: https://arweave.net/${tx.id}`);

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
