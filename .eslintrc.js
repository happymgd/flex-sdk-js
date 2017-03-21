module.exports = {
  extends: [
    'airbnb-base',
    'prettier',
  ],
  parserOptions: {
    sourceType: 'module',
  },
  env: {
    es6: true,
    browser: false,
    node: false,
    jest: true
  },
};
