const express = require('express');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Simple API to send QR via email
app.post('/api/send-qr', async (req, res) => {
  try {
    const { name, email, token, qrData } = req.body;

    // Generate QR code as buffer
    const qrBuffer = await QRCode.toBuffer(JSON.stringify(qrData), {
      width: 300,
      margin: 2
    });

    // Simple email HTML
    const emailHtml = `
      <h2>Your RSVP QR Code</h2>
      <p>Hi ${name},</p>
      <p>Here's your QR code:</p>
      <img src="cid:qrcode" style="max-width: 250px;" />
      <p>Token: ${token}</p>
    `;

    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your QR Code',
      html: emailHtml,
      attachments: [{
        filename: 'qr-code.png',
        content: qrBuffer,
        cid: 'qrcode'
      }]
    });

    res.json({ success: true, message: 'Email sent!' });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Failed to send email' });
  }
});

// Test endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Email API is running!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});