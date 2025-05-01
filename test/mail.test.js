require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const { matchedData, check } = require('express-validator');
const { handleHttpError } = require('../utils/handleError');
const { validateResults } = require('../utils/handleValidator');
const { send } = require('../controllers/mail');
const { validatorMail } = require('../validators/mail');

jest.mock('nodemailer');
jest.mock('googleapis');
jest.mock('../utils/handleError', () => ({ handleHttpError: jest.fn() }));
jest.mock('express-validator', () => ({
  ...jest.requireActual('express-validator'),
  matchedData: jest.fn(),
}));

jest.mock('../utils/handleMails', () => ({
  sendEmail: jest.fn(),
}));

const { sendEmail } = require('../utils/handleMails');

const makeRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  send: jest.fn(),
});

describe('validators/mail.js – validatorMail', () => {
  test('calls validateResults after validation chain', () => {
    const req = { body: { subject: 'test', text: 'test', to: 'test@test.com', from: 'from@test.com' } };
    const res = {};
    const next = jest.fn();

    validatorMail.forEach(middleware => middleware(req, res, next));

    expect(next).toHaveBeenCalled();
  });
});

describe('utils/handleMails.js – sendEmail', () => {
  beforeEach(() => jest.clearAllMocks());

  test('successfully sends an email', async () => {
    const sendMailMock = jest.fn().mockResolvedValue(true);
    nodemailer.createTransport.mockReturnValue({ sendMail: sendMailMock });

    google.auth.OAuth2.mockImplementation(() => ({
      setCredentials: jest.fn(),
      getAccessToken: (cb) => cb(null, 'fake-access-token'),
    }));

    const emailOptions = { to: 'test@example.com', subject: 'Hello', text: 'Hello World' };
    const { sendEmail: actualSendEmail } = jest.requireActual('../utils/handleMails');
    await expect(actualSendEmail(emailOptions)).resolves.toBeUndefined();

    expect(sendMailMock).toHaveBeenCalledWith(emailOptions);
  });

  test('logs error if transporter creation fails', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    google.auth.OAuth2.mockImplementation(() => ({
      setCredentials: jest.fn(),
      getAccessToken: (cb) => cb(new Error('OAuth failure'), null),
    }));

    const { sendEmail: actualSendEmail } = jest.requireActual('../utils/handleMails');
    await expect(actualSendEmail({})).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

describe('controllers/mail.js – send', () => {
  beforeEach(() => jest.clearAllMocks());

  test('successfully sends email from controller', async () => {
    const fakeData = { to: 'user@test.com', subject: 'Hello', text: 'World', from: 'me@test.com' };
    matchedData.mockReturnValue(fakeData);

    sendEmail.mockResolvedValue(true);

    const res = makeRes();
    await send({}, res);

    expect(res.send).toHaveBeenCalled();
  });

  test('handles errors from sendEmail', async () => {
    matchedData.mockReturnValue({});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    sendEmail.mockImplementation(() => { throw new Error('Sending failed'); });

    const res = makeRes();
    await send({}, res);

    expect(handleHttpError).toHaveBeenCalledWith(res, 'ERROR_SEND_EMAIL');
  });

  test('handles errors from matchedData', async () => {
    const error = new Error('matchedData failed');
    matchedData.mockImplementation(() => { throw error; });

    const res = makeRes();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await send({}, res);

    expect(consoleSpy).toHaveBeenCalledWith('Error en envío de email:', error);
    expect(handleHttpError).toHaveBeenCalledWith(res, 'ERROR_SEND_EMAIL');

    consoleSpy.mockRestore();
  });
});
