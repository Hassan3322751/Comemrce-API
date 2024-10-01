import { Router } from 'express';
import handler from 'express-async-handler';
import auth from '../middleware/auth.mid.js';
import { BAD_REQUEST } from '../constants/httpStatus.js';
import { OrderModel } from '../models/order.model.js';
import { OrderStatus } from '../constants/orderStatus.js';
import { UserModel } from '../models/user.model.js';
import { sendEmailReceipt } from '../helpers/mail.helper.js';

import stripe from 'stripe';
const stripeInstance = new stripe('sk_test_51Q41a4KIet24XIcEpJTka1D9AfSckFq9hWBjXHrnKGs8pQLV5aol1GSSNAjzIsn9bc0Aeo2OuVnin3PDBAC9w9Tn00nu9aOcDJ');

const router = Router();
router.use(auth);

router.post(
  '/create',
  handler(async (req, res) => {
    const order = req.body;

    if (order.items.length <= 0) res.status(BAD_REQUEST).send('Cart Is Empty!');

    await OrderModel.deleteOne({
      user: req.user.id,
      status: OrderStatus.NEW,
    });

    const newOrder = new OrderModel({ ...order, user: req.user.id });
    await newOrder.save();
    res.send(newOrder);
  })
); 

router.post(
  '/pay',
  handler(async (req, res) => {
    const { body } = req.body;
    const order = await getNewOrderForCurrentUser(req);

    if (!order) {
      res.status(BAD_REQUEST).send('Order Not Found!');
      return;
    }

    const line_items = body.map((product) => ({
        price_data:{
        currency: "usd",
        product_data: {
          name: product.food.name,
          images: [product.food.imageUrl]
        },
        unit_amount: Math.round(product.food.price * 100),
      },
      quantity: product.quantity
    })
  );

  try {
    const session = await stripeInstance.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: line_items,
      mode: "payment",
      success_url: "http://localhost:3000/PaymentSuccess", 
      cancel_url:"http://localhost:3000/PaymentFailed"
    })

    order.paymentId = session.id;
    order.status = OrderStatus.PAYED;
    await order.save();
    sendEmailReceipt(order);

    res.json({id: session.id})

  } catch (error) {
    console.log("Error: " + error)
    res.send(error)
  }

  })
);

router.get(
  '/track/:orderId',
  handler(async (req, res) => {
    const { orderId } = req.params;
    const user = await UserModel.findById(req.user.id);

    const filter = {
      _id: orderId,
    };

    if (!user.isAdmin) {
      filter.user = user._id;
    }

    const order = await OrderModel.findOne(filter);

    if (!order) return res.send(UNAUTHORIZED);

    return res.send(order);
  })
);

router.get(
  '/newOrderForCurrentUser',
  handler(async (req, res) => {
    const order = await getNewOrderForCurrentUser(req);
    if (order) res.send(order);
    else res.status(BAD_REQUEST).send();
  })
);

router.get('/allstatus', (req, res) => {
  const allStatus = Object.values(OrderStatus);
  res.send(allStatus);
});

router.get(
  '/:status?',
  handler(async (req, res) => {
    const status = req.params.status;
    const user = await UserModel.findById(req.user.id);
    const filter = {};

    if (!user.isAdmin) filter.user = user._id;
    if (status) filter.status = status;

    const orders = await OrderModel.find(filter).sort('-createdAt');
    res.send(orders);
  })
);

const getNewOrderForCurrentUser = async req =>
  await OrderModel.findOne({
    user: req.user.id,
    status: OrderStatus.NEW,
  }).populate('user');
export default router;
