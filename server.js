const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());

// ✅ CCTV 검색 API
app.get('/api/cctv', (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Missing query parameter: q' });

  // 검색 필터링
  const result = cctvData
    .filter(item =>
      item.addr?.includes(query) || item.svcareaid?.includes(query)
    )
    .map(item => ({
      address: item.addr || '주소 없음',
      lat: parseFloat(item.wgsxpt),
      lot: parseFloat(item.wgsypt),
      qty: parseInt(item.qty) || 1,
      district: item.svcareaid || '',
      updatedAt: item.updtdate || ''
    }));

  res.json(result);
});

// ✅ 서버 시작
app.listen(PORT, () => {
  console.log(`✅ CCTV API Server running on port ${PORT}`);
});