// Test if Suno audio URLs are still valid
const urls = [
  'https://tempfile.aiquickdraw.com/r/a1a9fee2eae947ad8178984b088c1722.mp3',
  'https://tempfile.aiquickdraw.com/r/e0a18fcb05da478fadecd6ef09d305a3.mp3',
];

for (const url of urls) {
  console.log('\n--- Testing:', url.slice(-40));
  try {
    const r = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-15' } });
    console.log('Status:', r.status);
    console.log('Content-Type:', r.headers.get('content-type'));
    console.log('Content-Length:', r.headers.get('content-length'));
    console.log('Content-Range:', r.headers.get('content-range'));
    
    const buf = await r.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const hex = Array.from(bytes.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ');
    console.log('First 16 bytes (hex):', hex);
    
    // Check if it's a real MP3
    if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) {
      console.log('✅ Valid MP3 sync header detected');
    } else if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
      console.log('✅ Valid ID3 tag detected (MP3 with metadata)');
    } else if (bytes[0] === 0x3c) {
      console.log('❌ HTML detected — URL may have expired!');
      const text = new TextDecoder().decode(bytes);
      console.log('Text:', text);
    } else {
      console.log('⚠️ Unknown format');
    }
  } catch (e) {
    console.log('❌ Fetch error:', e.message);
  }
}
