import 'dotenv/config';
console.log('Loading imports...');

try {
  console.log('1. Auth routes');
  import('./routes/auth').then(() => console.log('✓ Auth'));
} catch (e) { console.error('✗ Auth:', e); }

try {
  console.log('2. Orders routes');
  import('./routes/orders').then(() => console.log('✓ Orders'));
} catch (e) { console.error('✗ Orders:', e); }

try {
  console.log('3. Calendar routes');
  import('./routes/calendar').then(() => console.log('✓ Calendar'));
} catch (e) { console.error('✗ Calendar:', e); }

try {
  console.log('4. Users routes');
  import('./routes/users').then(() => console.log('✓ Users'));
} catch (e) { console.error('✗ Users:', e); }

setTimeout(() => {
  console.log('Done');
  process.exit(0);
}, 2000);
