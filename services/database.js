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

async function addPlant(plantDetails, userId) {
  const {
    plantName,
    commonName,
    scientificName,
    location,
    img_url,
    waterInterval,
    mistInterval,
    fertilizeInterval,
    lastWatered,
    lastMisted,
    lastFertilized,
  } = plantDetails;

  const query1 = await db
    .query(
      `INSERT INTO plants (user_id, plant_name, common_name, scientific_name, location, img_url)
      VALUES ('${userId}', '${plantName}', '${commonName}', '${scientificName}', '${location}', '${img_url}')
      RETURNING *
  `
    )
    .then((res) => {
      return res[0];
    });

  const query2 = await db.query(
    `INSERT INTO journal (plant_id, water_interval, mist_interval, fertilize_interval, last_watered, last_misted, last_fertilized )
  VALUES (${query1.id}, ${waterInterval ? waterInterval : null}, ${mistInterval ? mistInterval : null}, ${fertilizeInterval ? fertilizeInterval : null}, ${lastWatered ? `'${lastWatered.toString()}'` : null}, ${lastMisted ? `'${lastMisted.toString()}'` : null}, ${lastFertilized ? `'${lastFertilized.toString()}'` : null})`
  );
  return {plantAdded: true}
}

async function getPlantsByUserId(id) {
  const plantList = await db
    .query(
      `
      SELECT * FROM plants
      WHERE user_id = '${id}'
      `
    )
    .then((res) => {return res});
    return plantList;
}

module.exports = {
  addPlant,
  getPlantsByUserId,
};
