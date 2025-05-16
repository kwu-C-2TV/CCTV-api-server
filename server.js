const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());

// ✅ JSON 파일 로드
const rawData = fs.readFileSync('./서울시 안심이 CCTV 연계 현황.json');
const cctvData = JSON.parse(rawData).DATA;

// ✅ CCTV 검색 API
app.get('/api/cctv', (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Missing query parameter: q' });

  try {
    const result = cctvData
      .filter(item =>
        item.addr?.includes(query) || item.svcareaid?.includes(query)
      )
      .map(item => {
        const lat = parseFloat(item.wgsxpt);
        const lot = parseFloat(item.wgsypt);

        if (isNaN(lat) || isNaN(lot)) return null; // 좌표가 숫자가 아니면 제외

        return {
          address: item.addr || '주소 없음',
          lat,
          lot,
          qty: parseInt(item.qty) || 1,
          district: item.svcareaid || '',
          updatedAt: item.updtdate || ''
        };
      })
      .filter(item => item !== null); // 유효한 좌표만 포함

    res.json(result);
  } catch (err) {
    console.error('❌ CCTV API Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ✅ 서버 시작
app.listen(PORT, () => {
  console.log(`✅ CCTV API Server running on port ${PORT}`);
});
