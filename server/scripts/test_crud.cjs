const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🚀 Starting BroCode E2E API & CRUD Verification...\n');
  const results = [];

  function record(testName, pass, details) {
    results.push({ testName, pass, details });
    console.log(`${pass ? '✅ PASS' : '❌ FAIL'}: ${testName}${details ? ` -> ${details}` : ''}`);
  }

  let ownerToken = null;
  const createdRecordIds = {
    foodItemIds: [],
    employeeUserIds: [],
    bookingIds: [],
  };

  try {
    // 1. Authenticate as Owner
    console.log('--- 1. Authenticating as Owner ---');
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: 'owner', password: 'OwnerPass2026!', expectedRole: 'OWNER' }),
      });
      const data = await res.json();
      if (res.ok && data.data?.token) {
        ownerToken = data.data.token;
        record('Owner Login', true, `Token obtained for ${data.data.user.name}`);
      } else {
        record('Owner Login', false, JSON.stringify(data));
        return;
      }
    } catch (err) {
      record('Owner Login', false, err.message);
      return;
    }

    const ownerHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    };

    // 2. Food Item CRUD
    console.log('\n--- 2. Food Item CRUD ---');
    let testFoodId = null;
    // CREATE
    try {
      const res = await fetch(`${BASE_URL}/food`, {
        method: 'POST',
        headers: ownerHeaders,
        body: JSON.stringify({
          name: 'E2E Test Energy Drink',
          category: 'BEVERAGES',
          price: 99,
          isAvailable: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.data?.id) {
        testFoodId = data.data.id;
        createdRecordIds.foodItemIds.push(testFoodId);
        record('Create Food Item', true, `Created ID: ${testFoodId}, Name: ${data.data.name}, Price: ₹${data.data.price}`);
      } else {
        record('Create Food Item', false, JSON.stringify(data));
      }
    } catch (err) {
      record('Create Food Item', false, err.message);
    }

    // READ
    try {
      const res = await fetch(`${BASE_URL}/food`, { method: 'GET' });
      const data = await res.json();
      const found = data.data?.find((f) => f.id === testFoodId);
      if (res.ok && found) {
        record('Read Food Catalog includes new item', true, `Found "${found.name}" in catalog`);
      } else {
        record('Read Food Catalog includes new item', false, 'Item not found in catalog');
      }
    } catch (err) {
      record('Read Food Catalog includes new item', false, err.message);
    }

    // UPDATE
    try {
      const res = await fetch(`${BASE_URL}/food/${testFoodId}`, {
        method: 'PUT',
        headers: ownerHeaders,
        body: JSON.stringify({
          price: 119,
          name: 'E2E Test Energy Drink Pro',
        }),
      });
      const data = await res.json();
      if (res.ok && data.data?.price === 119) {
        record('Update Food Item', true, `Updated price to ₹${data.data.price}, name to "${data.data.name}"`);
      } else {
        record('Update Food Item', false, JSON.stringify(data));
      }
    } catch (err) {
      record('Update Food Item', false, err.message);
    }

    // DELETE (Soft-disable)
    try {
      const res = await fetch(`${BASE_URL}/food/${testFoodId}`, {
        method: 'DELETE',
        headers: ownerHeaders,
      });
      const data = await res.json();
      if (res.ok) {
        record('Delete Food Item', true, `Successfully disabled test food item ${testFoodId}`);
      } else {
        record('Delete Food Item', false, JSON.stringify(data));
      }
    } catch (err) {
      record('Delete Food Item', false, err.message);
    }

    // VERIFY DISABLED
    try {
      const res = await fetch(`${BASE_URL}/food`, { method: 'GET' });
      const data = await res.json();
      const found = data.data?.find((f) => f.id === testFoodId);
      if (res.ok && found && found.isAvailable === false) {
        record('Confirm Food Item Disabled', true, `Item marked isAvailable: false`);
      } else {
        record('Confirm Food Item Disabled', false, `Item availability: ${found?.isAvailable}`);
      }
    } catch (err) {
      record('Confirm Food Item Disabled', false, err.message);
    }

    // 3. Employee CRUD (Owner Only)
    console.log('\n--- 3. Employee CRUD ---');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const testEmpId = `TEST_EMP_${randomSuffix}`;
    const testEmpMobile = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
    let testEmployeeRecordId = null;

    // CREATE
    try {
      const res = await fetch(`${BASE_URL}/employees`, {
        method: 'POST',
        headers: ownerHeaders,
        body: JSON.stringify({
          employeeId: testEmpId,
          name: 'E2E Test Employee',
          mobile: testEmpMobile,
          temporaryPassword: 'tempPass123!',
        }),
      });
      const data = await res.json();
      if (res.ok && data.data?.id) {
        testEmployeeRecordId = data.data.id;
        createdRecordIds.employeeUserIds.push(testEmployeeRecordId);
        record('Create Employee', true, `Created ID: ${testEmployeeRecordId}, EmpId: ${data.data.employeeId}`);
      } else {
        record('Create Employee', false, JSON.stringify(data));
      }
    } catch (err) {
      record('Create Employee', false, err.message);
    }

    // UPDATE
    if (testEmployeeRecordId) {
      try {
        const res = await fetch(`${BASE_URL}/employees/${testEmployeeRecordId}`, {
          method: 'PUT',
          headers: ownerHeaders,
          body: JSON.stringify({
            name: 'E2E Test Employee Updated',
          }),
        });
        const data = await res.json();
        if (res.ok && data.data?.name === 'E2E Test Employee Updated') {
          record('Update Employee', true, `Updated name to "${data.data.name}"`);
        } else {
          record('Update Employee', false, JSON.stringify(data));
        }
      } catch (err) {
        record('Update Employee', false, err.message);
      }

      // DELETE
      try {
        const res = await fetch(`${BASE_URL}/employees/${testEmployeeRecordId}`, {
          method: 'DELETE',
          headers: ownerHeaders,
        });
        const data = await res.json();
        if (res.ok) {
          record('Delete Employee', true, `Deleted test employee ${testEmployeeRecordId}`);
        } else {
          record('Delete Employee', false, JSON.stringify(data));
        }
      } catch (err) {
        record('Delete Employee', false, err.message);
      }
    }

    // 4. Booking & Session Operations
    console.log('\n--- 4. Booking & Session Operations ---');
    const now = new Date();
    const startTime = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
    const endTime = new Date(now.getTime() + 75 * 60 * 1000).toISOString();

    // Availability check
    try {
      const url = `${BASE_URL}/bookings/check-availability?stationIds=2&startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.data?.available !== undefined) {
        record('Check Station Availability', true, `Available: ${data.data.available}`);
      } else {
        record('Check Station Availability', false, JSON.stringify(data));
      }
    } catch (err) {
      record('Check Station Availability', false, err.message);
    }

    // CREATE Booking
    let testBookingId = null;
    try {
      const res = await fetch(`${BASE_URL}/bookings`, {
        method: 'POST',
        headers: ownerHeaders,
        body: JSON.stringify({
          customerName: 'E2E Test Customer',
          customerMobile: '+919999900000',
          stationIds: [2],
          controllerCount: 1,
          startTime,
          endTime,
          notes: 'Automated E2E Test Booking',
        }),
      });
      const data = await res.json();
      if (res.ok && data.data?.id) {
        testBookingId = data.data.id;
        createdRecordIds.bookingIds.push(testBookingId);
        record('Create Booking', true, `Booking ID: ${testBookingId}, Station: 2, GrandTotal: ₹${data.data.grandTotal}`);
      } else {
        record('Create Booking', false, JSON.stringify(data));
      }
    } catch (err) {
      record('Create Booking', false, err.message);
    }

    // EXTEND Booking
    if (testBookingId) {
      try {
        const res = await fetch(`${BASE_URL}/bookings/${testBookingId}/extend`, {
          method: 'POST',
          headers: ownerHeaders,
          body: JSON.stringify({ extendMinutes: 30 }),
        });
        const data = await res.json();
        if (res.ok && data.data?.id) {
          record('Extend Booking Session', true, `Extended booking by 30 mins, new grandTotal: ₹${data.data.grandTotal}`);
        } else {
          record('Extend Booking Session', false, JSON.stringify(data));
        }
      } catch (err) {
        record('Extend Booking Session', false, err.message);
      }

      // CANCEL Booking
      try {
        const res = await fetch(`${BASE_URL}/bookings/${testBookingId}/cancel`, {
          method: 'POST',
          headers: ownerHeaders,
          body: JSON.stringify({ cancelReason: 'E2E Test Clean-up' }),
        });
        const data = await res.json();
        if (res.ok && (data.data?.bookingStatus === 'CANCELLED' || data.data?.status === 'CANCELLED')) {
          record('Cancel Test Booking', true, `Booking marked as CANCELLED`);
        } else {
          record('Cancel Test Booking', false, JSON.stringify(data));
        }
      } catch (err) {
        record('Cancel Test Booking', false, err.message);
      }
    }

    // 5. Station Status Update
    console.log('\n--- 5. Station Status Update ---');
    try {
      const resMaintenance = await fetch(`${BASE_URL}/stations/4/status`, {
        method: 'PUT',
        headers: ownerHeaders,
        body: JSON.stringify({ status: 'MAINTENANCE' }),
      });
      const dataM = await resMaintenance.json();
      if (resMaintenance.ok && dataM.data?.status === 'MAINTENANCE') {
        record('Update Station Status to MAINTENANCE', true, `Table 4 status: ${dataM.data.status}`);
      } else {
        record('Update Station Status to MAINTENANCE', false, JSON.stringify(dataM));
      }

      // Restore to AVAILABLE
      const resAvailable = await fetch(`${BASE_URL}/stations/4/status`, {
        method: 'PUT',
        headers: ownerHeaders,
        body: JSON.stringify({ status: 'AVAILABLE' }),
      });
      const dataA = await resAvailable.json();
      if (resAvailable.ok && dataA.data?.status === 'AVAILABLE') {
        record('Restore Station Status to AVAILABLE', true, `Table 4 status: ${dataA.data.status}`);
      } else {
        record('Restore Station Status to AVAILABLE', false, JSON.stringify(dataA));
      }
    } catch (err) {
      record('Station Status Update', false, err.message);
    }

    // 6. Pricing Update (Owner Only)
    console.log('\n--- 6. Pricing Rules ---');
    try {
      const resGetPricing = await fetch(`${BASE_URL}/pricing`);
      const dataP = await resGetPricing.json();
      if (resGetPricing.ok && Array.isArray(dataP.data)) {
        record('Get Pricing Rules', true, `Retrieved ${dataP.data.length} pricing rules`);
      } else {
        record('Get Pricing Rules', false, JSON.stringify(dataP));
      }

      const resUpdatePricing = await fetch(`${BASE_URL}/pricing`, {
        method: 'PUT',
        headers: ownerHeaders,
        body: JSON.stringify({ deviceType: 'PS5', controllerCount: 1, hourlyRate: 90 }),
      });
      const dataUp = await resUpdatePricing.json();
      if (resUpdatePricing.ok && dataUp.data?.hourlyRate === 90) {
        record('Update Pricing Rule', true, `PS5 1-controller rate verified at ₹${dataUp.data.hourlyRate}`);
      } else {
        record('Update Pricing Rule', false, JSON.stringify(dataUp));
      }
    } catch (err) {
      record('Pricing Operations', false, err.message);
    }

    // 7. Dashboard Live Metrics
    console.log('\n--- 7. Live Dashboard Metrics ---');
    try {
      const res = await fetch(`${BASE_URL}/reports/dashboard-summary`, { headers: ownerHeaders });
      const data = await res.json();
      if (res.ok && data.data?.totalStations === 8) {
        record('Dashboard Summary Real Data', true, `Total Stations: ${data.data.totalStations}, Available: ${data.data.availableStations}, Server Time: ${data.data.serverTime}`);
      } else {
        record('Dashboard Summary Real Data', false, JSON.stringify(data));
      }
    } catch (err) {
      record('Dashboard Summary Real Data', false, err.message);
    }

    console.log('\n=== SUMMARY ===');
    const passed = results.filter((r) => r.pass).length;
    const failed = results.filter((r) => !r.pass).length;
    console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
    if (failed > 0) process.exit(1);
  } finally {
    // Clean up test records created during testing
    console.log('\n🧹 Cleaning up test records...');
    try {
      // Clean up test employees starting with TEST_EMP_
      await prisma.user.deleteMany({
        where: { employeeId: { startsWith: 'TEST_EMP_' } },
      });
      // Clean up test food items starting with E2E Test
      await prisma.foodItem.deleteMany({
        where: { name: { startsWith: 'E2E Test' } },
      });
      // Clean up test bookings
      for (const bId of createdRecordIds.bookingIds) {
        await prisma.bookingFoodItem.deleteMany({ where: { bookingId: bId } });
        await prisma.bookingStation.deleteMany({ where: { bookingId: bId } });
        await prisma.payment.deleteMany({ where: { bookingId: bId } });
        await prisma.booking.deleteMany({ where: { id: bId } });
      }
      console.log('✅ Clean-up completed.');
    } catch (cleanupErr) {
      console.error('Clean-up warning:', cleanupErr);
    }
    await prisma.$disconnect();
  }
}

runTests();
