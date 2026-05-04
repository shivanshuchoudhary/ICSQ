import nodemailer from 'nodemailer';

// Create SMTP transporter for email sending
const createTransporter = () => {
  // Check if SMTP credentials are configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_MAIL || !process.env.SMTP_PASS) {
    console.warn('SMTP credentials not configured - email notifications will be disabled');
    return null;
  }

  const port = parseInt(process.env.SMTP_PORT) || 587;
  
  // Use a very simple configuration that's most compatible
  const config = {
    host: process.env.SMTP_HOST,
    port: port,
    secure: false, // Always use STARTTLS instead of SSL
    auth: {
      user: process.env.SMTP_MAIL,
      pass: process.env.SMTP_PASS,
    },
    // Minimal TLS configuration
    tls: {
      rejectUnauthorized: false,
      // Don't specify versions to let the system negotiate
    },
    // Connection settings
    connectionTimeout: 30000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    // Disable pooling to avoid connection issues
    pool: false
  };

  console.log(`Creating email transporter for ${process.env.SMTP_HOST}:${port}`);
  return nodemailer.createTransport(config);
};

// Helper function to send email with retry logic
const sendEmailWithRetry = async (transporter, mailOptions, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Email attempt ${attempt}/${maxRetries}`);
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`Email attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        return { success: false, error: error.message };
      }
      
      // Wait before retrying (exponential backoff)
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Send action plan assignment email to the assigned user
export const sendActionPlanAssignmentEmail = async (assignedUser, actionPlan, assignedByUser) => {
  try {
    console.log(`Sending action plan assignment email to ${assignedUser.email}`);
    
    const transporter = createTransporter();
    if (!transporter) {
      console.log('SMTP not configured - skipping action plan assignment notification');
      return { success: false, error: 'SMTP not configured' };
    }
    
    // Import models to fetch department and category names
    const { Department } = await import('../models/Department.model.js');
    const { Category } = await import('../models/Category.model.js');
    const { Survey } = await import('../models/Survey.model.js');
    
    // Get department and category names
    let departmentName = 'N/A';
    let categoryName = 'N/A';
    
    // For "Concerned Departments", we want the department FROM which the response came
    // Try multiple approaches to get the correct department name
    
    console.log('=== EMAIL DEBUG INFO ===');
    console.log('Action plan originalSurveyRespondents:', actionPlan.originalSurveyRespondents);
    console.log('Assigned user:', assignedUser);
    console.log('Action plan departments:', actionPlan.departments);
    
    // Approach 1: Try to get from originalSurveyRespondents' survey data
    if (actionPlan.originalSurveyRespondents && actionPlan.originalSurveyRespondents.length > 0) {
      console.log('Found originalSurveyRespondents, trying to get department from survey data...');
      const firstRespondent = actionPlan.originalSurveyRespondents[0];
      console.log('First respondent:', firstRespondent);
      
      if (firstRespondent.surveyId) {
        try {
          console.log('Looking up survey with ID:', firstRespondent.surveyId);
          const survey = await Survey.findById(firstRespondent.surveyId).select('fromDepartment');
          console.log('Survey found:', survey);
          
          if (survey && survey.fromDepartment) {
            console.log('Survey has fromDepartment:', survey.fromDepartment);
            const dept = await Department.findById(survey.fromDepartment).select('name');
            console.log('Department found:', dept);
            if (dept) {
              departmentName = dept.name;
              console.log('✅ Successfully got department from survey data:', departmentName);
            }
          } else {
            console.log('❌ Survey not found or no fromDepartment');
          }
        } catch (error) {
          console.error('❌ Error fetching survey department:', error);
        }
      } else {
        console.log('❌ No surveyId in first respondent');
      }
    } else {
      console.log('❌ No originalSurveyRespondents found');
    }
    
    // Approach 2: If still N/A, try to get from the assigned user's department
    if (departmentName === 'N/A' && assignedUser && assignedUser.currentDepartment) {
      console.log('Trying to get department from assigned user...');
      try {
        const dept = await Department.findById(assignedUser.currentDepartment).select('name');
        console.log('Assigned user department found:', dept);
        if (dept) {
          departmentName = dept.name;
          console.log('✅ Successfully got department from assigned user:', departmentName);
        }
      } catch (error) {
        console.error('❌ Error fetching assigned user department:', error);
      }
    }
    
    // Approach 3: If still N/A, fallback to assigned department (action plan's department)
    if (departmentName === 'N/A' && actionPlan.departments && actionPlan.departments.length > 0) {
      console.log('Trying to get department from action plan departments...');
      if (typeof actionPlan.departments[0] === 'object' && actionPlan.departments[0].name) {
        departmentName = actionPlan.departments[0].name;
        console.log('✅ Successfully got department from action plan (populated):', departmentName);
      } else {
        try {
          const dept = await Department.findById(actionPlan.departments[0]).select('name');
          console.log('Action plan department found:', dept);
          if (dept) {
            departmentName = dept.name;
            console.log('✅ Successfully got department from action plan (fetched):', departmentName);
          }
        } catch (error) {
          console.error('❌ Error fetching action plan department:', error);
        }
      }
    }
    
    console.log('Final department name before uppercase:', departmentName);
    
    // Convert department name to uppercase
    departmentName = departmentName.toUpperCase();
    
    if (actionPlan.categories && actionPlan.categories.length > 0) {
      if (typeof actionPlan.categories[0] === 'object' && (actionPlan.categories[0].name || actionPlan.categories[0].category)) {
        // Already populated
        categoryName = actionPlan.categories[0].name || actionPlan.categories[0].category;
      } else {
        // Need to fetch from database
        const cat = await Category.findById(actionPlan.categories[0]).select('name');
        categoryName = cat ? cat.name : 'N/A';
      }
    }
    
    // Email template
    const emailSubject = `You have been assigned an ICSQ Action by your HOD`;
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>ICSQ Action Assignment</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .content { padding: 30px; }
          .action-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .action-table td { padding: 12px; border-bottom: 1px solid #eee; vertical-align: top; }
          .action-table td:first-child { font-weight: bold; color: #2c3e50; width: 200px; }
          .action-table td:last-child { color: #666; }
          .highlight { background-color: #fff3cd; padding: 8px; border-radius: 4px; }
          .cta { margin-top: 30px; text-align: center; }
          .cta a { color: #007bff; text-decoration: underline; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content">
            <table class="action-table">
              <tr>
                <td>Category:</td>
                <td>${categoryName}</td>
              </tr>
              <tr>
                <td>Concerned Departments:</td>
                <td>${departmentName}</td>
              </tr>
              <tr>
                <td>Response:</td>
                <td>"${actionPlan.expectations}"</td>
              </tr>
              <tr>
                <td>Action Assigned:</td>
                <td><span class="highlight">${actionPlan.actionplan || actionPlan.instructions || 'No action plan specified'}</span></td>
              </tr>
              <tr>
                <td>Target Date:</td>
                <td><span class="highlight">${new Date(actionPlan.targetDate).toLocaleDateString()}</span></td>
              </tr>
            </table>
            
            <div class="cta">
              <p>👉 To access the <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/action-plans">ICSQ Action Module</a> and update the status once completed.</p>
            </div>
          </div>
          
          <div class="footer">
            <p>This is an automated notification from the ICSQ Action Plan System.</p>
            <p>© ${new Date().getFullYear()} Sobha Realty. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const emailText = `
Subject: You have been assigned an ICSQ Action by your HOD.

Category: ${categoryName}
Concerned Departments: ${departmentName}
Response: "${actionPlan.expectations}"
Action Assigned: ${actionPlan.actionplan || actionPlan.instructions || 'No action plan specified'}
Target Date: ${new Date(actionPlan.targetDate).toLocaleDateString()}

👉 To access the ICSQ Action Module and update the status once completed.
Link: ${process.env.CLIENT_URL || 'http://localhost:5173'}/action-plans

This is an automated notification from the ICSQ Action Plan System.
© ${new Date().getFullYear()} Sobha Realty. All rights reserved.
    `;
    
    // Send email
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: assignedUser.email,
      subject: emailSubject,
      text: emailText,
      html: emailHtml
    };
    
    const result = await sendEmailWithRetry(transporter, mailOptions);
    
    if (result.success) {
      console.log(`Action plan assignment email sent successfully to ${assignedUser.email}`);
    } else {
      console.error(`Failed to send action plan assignment email to ${assignedUser.email}:`, result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Error in sendActionPlanAssignmentEmail:', error);
    return { success: false, error: error.message };
  }
};

// Test email configuration (admin only)
export const testEmailConfiguration = async () => {
  try {
    console.log('Testing email configuration...');
    
    const transporter = createTransporter();
    if (!transporter) {
      return { success: false, error: 'SMTP not configured' };
    }
    
    // Test sending a simple email
    const testMailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: process.env.EMAIL_FROM || process.env.EMAIL_USER, // Send to self for testing
      subject: 'ICSQ Email Configuration Test',
      text: 'This is a test email to verify the email configuration is working correctly.',
      html: '<p>This is a test email to verify the email configuration is working correctly.</p>'
    };
    
    const result = await sendEmailWithRetry(transporter, testMailOptions);
    
    if (result.success) {
      console.log('Email configuration test passed');
      return { success: true, message: 'Email configuration is working correctly' };
    } else {
      console.error('Email configuration test failed:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('Error testing email configuration:', error);
    return { success: false, error: error.message };
  }
};
