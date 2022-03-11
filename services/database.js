const { get } = require("express/lib/response");
const { Pool } = require("pg");
const pgp = require("pg-promise")();

const connection = {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
};

const db = pgp(connection);

const database = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function getUsers() {
  return database
    .query(
      `
      SELECT
        *
      FROM
        users;
    `
    )
    .then((results) => results.rows);
}

function getUserById(id) {
  return database
    .query(
      `
      SELECT * FROM users WHERE id = $1
    `,
      [id]
    )
    .then((results) => results.rows[0]);
}

function getUserByEmail(email) {
  return database
    .query(
      `
    SELECT id, firstname, surname, email, password FROM users WHERE email = $1
  `,
      [email]
    )
    .then((results) => results.rows[0]);
}

function getMessages(from_user_id, to_user_id) {
  return database
    .query(
      `
      SELECT M.id, U.firstname as from_firstname, U.surname as from_surname, U.img_url as from_img_url, U2.firstname as to_firstname, U2.surname as to_surname, M.from_user_id, M.to_user_id, M.message, M.created_at
      FROM messages M
      JOIN users U
      ON M.from_user_id = U.id
      JOIN users U2
      ON M.to_user_id = U2.id
WHERE (from_user_id = $1 AND  to_user_id = $2) OR (from_user_id = $2 AND  to_user_id = $1)
ORDER BY created_at  DESC
    `,
      [from_user_id, to_user_id]
    )
    .then((results) => results.rows);
}

function getMessagesByUserId(id) {
  return database
    .query(
      `
      SELECT M.id, U.firstname as from_firstname, U.surname as from_surname, M.from_user_id, U.img_url as from_img_url, M.to_user_id, U2.firstname as to_firstname, U2.surname as to_surname, U2.img_url as to_img_url, M.message, M.created_at
FROM messages M
JOIN users U
ON M.from_user_id = U.id
JOIN users U2
ON M.to_user_id = U2.id
WHERE from_user_id = $1 OR to_user_id = $1
ORDER BY created_at DESC
    `,
      [id]
    )
    .then((results) => results.rows);
}

function postNewMessage(fromUserId, toUserId, newMessage) {
  return database
    .query(
      `
    INSERT INTO messages
      (from_user_id, to_user_id, message)
    VALUES
      ($1, $2, $3)
    RETURNING
      *
  `,
      [fromUserId, toUserId, newMessage]
    )
    .then((results) => results.rows[0]);
}

function getPotentialMatches(id) {
  return database
    .query(
      `SELECT
      id, firstname, surname, bio, img_url, sex, breed, age
  FROM
      users
  WHERE NOT EXISTS (
      SELECT *
      FROM
          likes
      WHERE
          likes.from_user_id = $1 AND users.id = likes.to_user_id
  )
  AND NOT users.id = $1
  ORDER BY id
      `,
      [id]
    )
    .then((results) => results.rows);
}

function getUserMatchesById(id) {
  return database
    .query(
      `
      SELECT A.id, U.surname, U.firstname, U.img_url, U.bio, U.age, U.sex, A.from_user_id AS me, B.from_user_id AS user_who_matched
      FROM likes A
      JOIN users U
      ON U.id = A.to_user_id
      JOIN likes B
        ON A.from_user_id = B.to_user_id
        AND A.to_user_id = B.from_user_id
        AND A.id <> B.id
      WHERE A.likes = true
        AND B.likes = true
  AND A.from_user_id = $1;
      `,
      [id]
    )
    .then((results) => results.rows);
}

function createUser(
  img_url,
  surname,
  firstname,
  email,
  password,
  sex,
  age,
  breed,
  bio
) {
  return database
    .query(
      `
    INSERT INTO users
      (img_url, surname, firstname, email, password, bio, breed, sex, age)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING
      *
  `,
      [img_url, surname, firstname, email, password, bio, breed, sex, age]
    )
    .then((results) => results.rows[0]);
}

function editUser(
  id,
  surname,
  firstname,
  email,
  password,
  sex,
  age,
  breed,
  bio,
  img_url
) {
  return database
    .query(
      `UPDATE users SET (surname, firstname, email, password, sex, age, breed, bio, img_url) = ($2, $3, $4, $5, $6, $7, $8, $9, $10)
      WHERE id = $1
      RETURNING
      *
      `,
      [id, surname, firstname, email, password, sex, age, breed, bio, img_url]
    )
    .then((results) => results.rows[0]);
}

async function deleteUser(id) {
  console.log(id);
  const query = await db
    .multi(
      `
      DELETE FROM likes WHERE from_user_id = ${id} OR to_user_id = ${id};
      DELETE FROM messages WHERE from_user_id = ${id} OR to_user_id = ${id};
      DELETE from users WHERE id = ${id};
      `
    )
    .then((res) => {
      return res.rows;
    });
  return {userDeleted: true};
}

async function postReaction(from_user_id, to_user_id, likes) {
  const query = await db
    .multi(
      `
      UPDATE likes SET likes=${likes}
      WHERE from_user_id=${from_user_id} AND to_user_id=${to_user_id};

      INSERT INTO likes (from_user_id, to_user_id, likes)
             SELECT ${from_user_id}, ${to_user_id}, ${likes}
             WHERE NOT EXISTS (SELECT 1 FROM likes
             WHERE from_user_id=${from_user_id} AND to_user_id=${to_user_id});
  `
    )
    .then((res) => {
      return res.rows;
    });
  return query;
}

module.exports = {
  getUsers,
  editUser,
  createUser,
  deleteUser,
  getUserById,
  getMessages,
  postReaction,
  getUserByEmail,
  postNewMessage,
  getUserMatchesById,
  getMessagesByUserId,
  getPotentialMatches,
};
