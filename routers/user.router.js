import { Router } from 'express';
import jwt from 'jsonwebtoken';
const router = Router();
import { BAD_REQUEST } from '../constants/httpStatus.js';
import handler from 'express-async-handler';
import { UserModel } from '../models/user.model.js';
import bcrypt from 'bcryptjs';
import auth from '../middleware/auth.mid.js';
import admin from '../middleware/admin.mid.js';
const PASSWORD_HASH_SALT_ROUNDS = 10;

router.post(
  '/login',
  handler(async (req, res) => {
    const { email, password } = req.body;
    const user = await UserModel.findOne({ email });
    
    if (user && (await bcrypt.compare(password, user.password))) {
      const token = generateTokenResponse(user); 

      return res.cookie("token", token, { 
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        domain : null, 
        cookie: true
    }).status(200).send({
      name: user.name
    });
    }

    res.status(BAD_REQUEST).send('Username or password is invalid');
  })
);

router.get(
  '/getUser',
  auth
  ,
  handler(async (req, res) => {
    const user = req.user;
    
    return res.status(200).send({
      name: user.name,
      address: user.address,
      isAdmin: user.isAdmin
    })
  })
);

router.post(
  '/register',
  handler(async (req, res) => {
    const { name, email, password, address } = req.body;

    const user = await UserModel.findOne({ email });

    if (user) {
      res.status(BAD_REQUEST).send('User already exists, please login!');
      return;
    }

    const hashedPassword = await bcrypt.hash(
      password,
      PASSWORD_HASH_SALT_ROUNDS
    );

    const newUser = {
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      address,
    };

    const result = await UserModel.create(newUser);
    const token = generateTokenResponse(result); 

      return res.cookie("token", token, { 
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        domain : null, 
        cookie: true
    }).status(200);
  })
);

router.post(
  '/logout',
  handler((req, res) => {
    try{
      res.clearCookie('token').send(null)
    } catch(error){
      res.send(error)
    }
  })
)

router.put(
  '/updateProfile',
  auth,
  handler(async (req, res) => {
    const { name, address } = req.body;
    const user = await UserModel.findByIdAndUpdate(
      req.user.id,
      { name, address },
      { new: true }
    );

    res.send(generateTokenResponse(user));
  })
);

router.put(
  '/changePassword',
  auth,
  handler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = await UserModel.findById(req.user.id);

    if (!user) {
      res.status(BAD_REQUEST).send('Change Password Failed!');
      return;
    }

    const equal = await bcrypt.compare(currentPassword, user.password);

    if (!equal) {
      res.status(BAD_REQUEST).send('Current Password Is Not Correct!');
      return;
    }

    user.password = await bcrypt.hash(newPassword, PASSWORD_HASH_SALT_ROUNDS);
    await user.save();

    res.send();
  })
);

router.get(
  '/getall/:searchTerm?',
  admin,
  handler(async (req, res) => {
    const { searchTerm } = req.params;

    const filter = searchTerm
      ? { name: { $regex: new RegExp(searchTerm, 'i') } }
      : {};

    const users = await UserModel.find(filter, { password: 0 });
    res.send(users);
  })
);

router.put(
  '/toggleBlock/:userId',
  admin,
  handler(async (req, res) => {
    const { userId } = req.params;

    if (userId === req.user.id) {
      res.status(BAD_REQUEST).send("Can't block yourself!");
      return;
    }

    const user = await UserModel.findById(userId);
    user.isBlocked = !user.isBlocked;
    user.save();

    res.send(user.isBlocked);
  })
);

router.get(
  '/getById/:userId',
  admin,
  handler(async (req, res) => {
    const { userId } = req.params;
    const user = await UserModel.findById(userId, { password: 0 });
    res.send(user);
  })
);

router.put(
  '/update',
  admin,
  handler(async (req, res) => {
    const { id, name, email, address, isAdmin } = req.body;
    await UserModel.findByIdAndUpdate(id, {
      name,
      email,
      address,
      isAdmin,
    });

    res.send();
  })
);

const generateTokenResponse = user => {
  const token = jwt.sign(
    {
      id: user._id,
      email: user.email,
      name: user.name,
      address: user.address,
      isAdmin: user.isAdmin,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '30d',
    }
  );

  return {
    token
  };
};

export default router;
