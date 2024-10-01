import NodeMailer from "nodemailer"

export const sendEmailReceipt = async function(order) {
  let transport= NodeMailer.createTransport({
    service:"gmail",
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
     auth:{
         user:process.env.EMAIL,
         pass:process.env.APP_PASS,
     }
  })

  let mailOptions={
      from: 'Food Store',
      to: order.user.email,
      subject: `Order ${order.id} : ${order.name} is being processed`,
      html: getReceiptHtml(order)
  }

  try {
    await transport.sendMail(mailOptions)
    console.log("Email Success")
    
  } catch (error) {
    console.log(error)
  }
};

const getReceiptHtml = function (order) {
  return `
  <html>
    <head>
      <style>
      table {
        border-collapse: collapse;
        max-width:35rem;
        width: 100%;
      }
      th, td{
        text-align: left;
        padding: 8px;
      }
      th{
        border-bottom: 1px solid #dddddd;
      }
      </style>
    </head>
    <body>
      <h1>Order Payment Confirmation</h1>
      <p>Dear ${order.name},</p>
      <p>Thank you for choosing us! Your order has been successfully paid and is now being processed.</p>
      <p><strong>Tracking ID:</strong> ${order.id}</p>
      <p><strong>Order Date:</strong> ${order.createdAt
        .toISOString()
        .replace('T', ' ')
        .substr(0, 16)}</p>
        <h2>Order Details</h2>
        <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Unit Price</th>
            <th>Quantity</th>
            <th>Total Price</th>
          </tr>
        </thead>
        <tbody>
        ${order.items
          .map(
            item =>
              `
            <tr>
            <td>${item.food.name}</td>
            <td>$${item.food.price}</td>
            <td>${item.quantity}</td>    
            <td>$${item.price.toFixed(2)}</td>
            </tr>
            `
          )
          .join('\n')}
          </tbody>
          <tfoot>
          <tr>
          <td colspan="3"><strong>Total:</strong></td>
          <td>$${order.totalPrice}</td>
          </tr>
          </tfoot>
          </table>
          <p><strong>Shipping Address:</strong> ${order.address}</p>
        </body>
      </html>
    
    `;
};
