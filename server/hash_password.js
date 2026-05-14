const bcrypt = require('bcryptjs');

const password = "Demo123";
const salt = bcrypt.genSaltSync(12);
const hash = bcrypt.hashSync(password, salt);

console.log("Password:", password);
console.log("Hash:", hash);
