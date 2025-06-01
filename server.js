const express = require('express');
const cors = require('cors');
const fs = require('fs');
const axios = require('axios');
const xml2js = require('xml2js');
const proj4 = require('proj4');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());

// ✅ CCTV JSON 데이터 로드
const rawData = fs.readFileSync('./서울시 안심이 CCTV 연계 현황.json');
const cctvData = JSON.parse(rawData).DATA;

// ✅ 가로등 CSV 데이터 로드 및 파싱
const streetlampRaw = fs.readFileSync('./서울특별시_가로등 위치 정보_20221108.csv', 'utf-8');
const streetlampData = streetlampRaw
  .split('\n')
  .slice(1)
  .map(line => {
    const [id, lat, lng] = line.split(',');
    return {
      id: id?.trim(),
      lat: parseFloat(lat),
      lng: parseFloat(lng)
    };
  })
  .filter(item => !isNaN(item.lat) && !isNaN(item.lng));

// ✅ 좌표 변환 (TM -> WGS84)
const EPSG5179 = "+proj=tmerc +lat_0=38 +lon_0=127.5 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +units=m +no_defs";
const EPSG4326 = "+proj=longlat +datum=WGS84 +no_defs";

function convertToWGS84(x, y) {
  return proj4(EPSG5179, EPSG4326, [x, y]); // [lng, lat]
}

// ✅ 거리 계산 함수 (Haversine)
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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
        if (isNaN(lat) || isNaN(lot)) return null;

        return {
          address: item.addr || '주소 없음',
          lat,
          lot,
          qty: parseInt(item.qty) || 1,
          district: item.svcareaid || '',
          updatedAt: item.updtdate || ''
        };
      })
      .filter(item => item !== null);

    res.json(result);
  } catch (err) {
    console.error('❌ CCTV API Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ✅ 가로등 API
app.get('/api/streetlamps', (req, res) => {
  const { lat, lng, radius } = req.query;
  if (!lat || !lng || !radius) {
    return res.status(400).json({ error: 'Missing parameters: lat, lng, radius' });
  }

  const result = streetlampData.filter(item => {
    const d = getDistance(parseFloat(lat), parseFloat(lng), item.lat, item.lng);
    return d <= parseFloat(radius);
  });

  res.json({
    count: result.length,
    lamps: result
  });
});

// ✅ 편의점 API
app.get('/api/convenience', async (req, res) => {
  const { lat, lng, radius } = req.query;
  if (!lat || !lng || !radius) return res.status(400).json({ error: 'Missing params' });

  const API_KEY = "5PBKIGYX-5PBK-5PBK-5PBK-5PBKIGYXYU";

  try {
    const { data } = await axios.get(`https://safemap.go.kr/openApiService/data/getConvenienceStoreData.do?serviceKey=${API_KEY}`);
    const result = await xml2js.parseStringPromise(data, { explicitArray: false });

    const items = result?.response?.body?.items?.item || [];
    const stores = (Array.isArray(items) ? items : [items])
      .map(store => {
        const x = parseFloat(store.X);
        const y = parseFloat(store.Y);
        if (isNaN(x) || isNaN(y)) return null;
        const [lon, lat_] = convertToWGS84(x, y);

        return {
          name: store.FCLTY_NM || '이름 없음',
          address: store.ADRES || '',
          lat: lat_,
          lng: lon
        };
      })
      .filter(store => store && getDistance(lat, lng, store.lat, store.lng) <= parseFloat(radius));

    res.json({ count: stores.length, stores });
  } catch (err) {
    console.error("편의점 API 오류:", err.message);
    res.status(500).json({ error: 'Convenience API fetch failed' });
  }
});

// ✅ 서버 시작
app.listen(PORT, () => {
  console.log(`✅ API Server running on port ${PORT}`);
});
