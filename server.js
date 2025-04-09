const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());

const rawData = fs.readFileSync('./서울시 금천구 CCTV 설치 위치정보.json');
const cctvData = JSON.parse(rawData).DATA;

app.get('/api/cctv', (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  const result = cctvData
    .filter(item =>
      item.daddr.includes(query) || item.crd_addr.includes(query)
    )
    .map(item => ({
      address: item.daddr,
      lat: parseFloat(item.lat),
      lot: parseFloat(item.lot)
    }));

  res.json(result);
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
