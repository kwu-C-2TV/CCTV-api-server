const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());

// ✅ JSON 파일 읽기
const rawData = fs.readFileSync('./서울시 안심이 CCTV 연계 현황.json');
const cctvData = JSON.parse(rawData).DATA;

// ✅ CCTV 검색 API
app.get('/api/cctv', (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Missing query parameter: q' });

  const result = cctvData
    .filter(item =>
      item.ADDR.includes(query) || item.SVCAREAID.includes(query)
    )
    .map(item => ({
      address: item.ADDR,
      lat: parseFloat(item.WGSXPT),  // 위도
      lot: parseFloat(item.WGSYPT),  // 경도
      qty: parseInt(item.QTY) || 1,  // CCTV 수량 (기본값 1)
      district: item.SVCAREAID,
      updatedAt: item.UPDTDATE
    }));

  res.json(result);
});

// ✅ 서버 시작
app.listen(PORT, () => {
  console.log(`✅ CCTV API Server running on port ${PORT}`);
});
