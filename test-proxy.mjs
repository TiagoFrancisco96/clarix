// Test the proxy endpoint
const audioUrl = 'https://tempfile.aiquickdraw.com/r/a1a9fee2eae947ad8178984b088c1722.mp3';
const proxyUrl = `http://localhost:3000/api/music/proxy?url=${encodeURIComponent(audioUrl)}`;

console.log('Testing proxy at:', proxyUrl.substring(0, 80) + '...');

try {
  const r = await fetch(proxyUrl);
  console.log('Status:', r.status);
  console.log('Content-Type:', r.headers.get('content-type'));
  console.log('Content-Length:', r.headers.get('content-length'));
  console.log('Accept-Ranges:', r.headers.get('accept-ranges'));
  
  const buf = await r.arrayBuffer();
  const bytes = new Uint8Array(buf);
  console.log('Actual bytes received:', buf.byteLength);
  
  const hex = Array.from(bytes.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join(' ');
  console.log('First 32 bytes:', hex);
  
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    console.log('✅ Real MP3 with ID3 tag!');
  } else if (bytes[0] === 0x7b || bytes[0] === 0x3c) {
    console.log('❌ Got JSON or HTML instead of audio!');
    console.log('Text:', new TextDecoder().decode(bytes.slice(0, 200)));
  } else {
    console.log('⚠️ Unknown format, first bytes suggest:', String.fromCharCode(...bytes.slice(0, 10)));
  }

  // Save test file
  const fs = await import('fs');
  fs.writeFileSync('e:/DEV/genspark/test-download.mp3', Buffer.from(buf));
  console.log('\nSaved to test-download.mp3 — try opening it in VLC!');
  
} catch (e) {
  console.log('Error:', e.message);
}
