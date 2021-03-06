module.exports = {
  extends: [
    'airbnb-base',
    'plugin:jest/recommended',
  ],

  'plugins': [
    'import',
    'jest',
  ],

  'rules': {
    'arrow-parens': ['error', 'as-needed'],
  },
};
