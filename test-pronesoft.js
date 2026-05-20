import { fetch } from 'undici';

async function run() {
  const tokenUrl = 'https://api.ecf.sandbox.pronesoft.com/api/v1/oauth/token';
  const clientId = 'app_live_d5229e3f57511d9889d84ea629b318c6';
  const clientSecret = 'sk_live_9ce77d6f63534f977967bda71999cf29d2a0045011ffe63db663ca92d1fd8511';

  try {
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, clientSecret })
    });
    
    const tokenData = await tokenRes.json();
    console.log("Token response acquired.");

    if (!tokenData.accessToken) return;

    const payload = {
      "version": "1.0",
      "invoiceType": "32",
      "issueDate": new Date().toISOString(),
      "paymentForms": [{"method":"1","amount":536.9}],
      "buyer": {"name":"Yeri Orlando JHJHUH"},
      "items": [{"lineNumber":1,"name":"Lavado y secado","type":"2","billingIndicator":"1","quantity":1,"unitPrice":81.9,"amount":81.9}],
      "totals": {"taxableAmount":455,"totalAmount":536.9,"itbisRate1":18,"totalITBIS":81.9},
      "environment": "TesteCF"
    };

    const submitUrl = 'https://api.ecf.sandbox.pronesoft.com/api/v1/TesteCF/ecf/submit';
    console.log("Sending payload to", submitUrl);
    
    const res = await fetch(submitUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    console.log("Response status:", res.status);
    console.log("Response body:", text);

  } catch (e) {
    console.error(e);
  }
}

run();
