const BASE_URL = 'http://localhost:5000/api';

async function main() {
  const mode = process.argv[2]; // 'set', 'verify', 'restore'
  
  const authRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeId: 'owner', password: 'OwnerPass2026!', expectedRole: 'OWNER' }),
  });
  const authData = await authRes.json();
  const token = authData.data.token;
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  if (mode === 'set') {
    const res = await fetch(`${BASE_URL}/pricing`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ deviceType: 'PS4', controllerCount: 1, hourlyRate: 75 }),
    });
    const data = await res.json();
    console.log(`SET: PS4 1-controller rate set to ₹${data.data?.hourlyRate}`);
  } else if (mode === 'verify') {
    const res = await fetch(`${BASE_URL}/pricing`);
    const data = await res.json();
    const rule = data.data?.find((r) => r.deviceType === 'PS4' && r.controllerCount === 1);
    console.log(`VERIFY: PS4 1-controller rate after restart is ₹${rule?.hourlyRate}`);
    if (rule?.hourlyRate !== 75) {
      console.error('FAIL: Expected rate 75 after restart!');
      process.exit(1);
    }
    console.log('SUCCESS: Rate persisted across backend restart!');
  } else if (mode === 'restore') {
    const res = await fetch(`${BASE_URL}/pricing`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ deviceType: 'PS4', controllerCount: 1, hourlyRate: 70 }),
    });
    const data = await res.json();
    console.log(`RESTORE: PS4 1-controller rate restored to ₹${data.data?.hourlyRate}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
