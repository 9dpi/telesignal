/**
 * GOOGLE APPS SCRIPT - API BRIDGE FOR UNIT Q
 * To be deployed as a Web App (Access: Anyone with link)
 */

const SHEET_NAME = 'Users'; // Tên của Sheet chứa dữ liệu

/**
 * Lấy số dư Q của người dùng qua Email
 * URL: [WEBAPP_URL]?email=user@gmail.com
 */
function doGet(e) {
  const email = e.parameter.email;
  if (!email) return createResponse({ success: false, error: 'Email is required' });

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  // Tim email trong cột A (Index 0)
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === email) {
      return createResponse({
        success: true,
        email: email,
        balance: data[i][1], // Cột B
        last_update: data[i][2] // Cột C
      });
    }
  }

  return createResponse({ success: false, error: 'User not found' });
}

/**
 * Cập nhật số dư Q (Trừ tiền sau khi Chat)
 * Body: { "email": "user@gmail.com", "amount": 0.05 }
 */
function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const email = params.email;
    const amountToSubtract = parseFloat(params.amount);

    if (!email || isNaN(amountToSubtract)) {
      return createResponse({ success: false, error: 'Invalid parameters' });
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === email) {
        const currentBalance = parseFloat(data[i][1]);
        const newBalance = currentBalance - amountToSubtract;
        
        // Cập nhật giá trị vào Sheet
        sheet.getRange(i + 1, 2).setValue(newBalance); // Cột B
        sheet.getRange(i + 1, 3).setValue(new Date()); // Cột C (Timestamp)
        
        return createResponse({
          success: true,
          new_balance: newBalance
        });
      }
    }

    return createResponse({ success: false, error: 'User not found' });
  } catch (err) {
    return createResponse({ success: false, error: err.message });
  }
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
