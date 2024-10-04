const crypto = require("crypto")

const CHANCE_BY_DIFFICULT = { easy: 0.75, medium: 0.5, hard: 0.25 }
const TOWER_POSSIBILITIES = [
  [0, 1, 2, 3],
  [0, 1, 3, 2],
  [0, 2, 1, 3],
  [0, 2, 3, 1],
  [0, 3, 1, 2],
  [0, 3, 2, 1],
  [1, 0, 2, 3],
  [1, 0, 3, 2],
  [1, 2, 0, 3],
  [1, 2, 3, 0],
  [1, 3, 0, 2],
  [1, 3, 2, 0],
  [2, 1, 0, 3],
  [2, 1, 3, 0],
  [2, 0, 1, 3],
  [2, 0, 3, 1],
  [2, 3, 1, 0],
  [2, 3, 0, 1],
  [3, 1, 2, 0],
  [3, 1, 0, 2],
  [3, 2, 1, 0],
  [3, 2, 0, 1],
  [3, 0, 1, 2],
  [3, 0, 2, 1]
]

const getHash256 = (message, digestType = "hex") => crypto.createHash("sha256").update(`${message}`).digest(digestType)

const getRaffleNumber = (privateSeed, publicSeed, nonce, minNumber, maxNumber) => {
  const range = maxNumber - minNumber + 1
  const concatenatedSeeds = `${privateSeed}${publicSeed}${nonce}`
  const hashNumber = getHash256(concatenatedSeeds)
  const raffled = BigInt(`0x${hashNumber}`) % BigInt(Math.floor(range))
  return minNumber + Number(raffled.toString())
}

const getRaffleChances = (privateSeed, publicSeed, nonce, chanceArray) => {
  const PRECISION = 1e8
  if (!Array.isArray(chanceArray)) chanceArray = Object.values(chanceArray)
  let summedChance = chanceArray.reduce((sum, value) => sum + (value.chance ?? value), 0)
  summedChance = summedChance * PRECISION
  const chosenValue = getRaffleNumber(privateSeed, publicSeed, nonce, 0, summedChance)
  let summedPossibilities = 0
  for (let i = 0; i < chanceArray.length; i++) {
    summedPossibilities += (chanceArray[i].chance ?? chanceArray[i]) * PRECISION
    if (chosenValue <= summedPossibilities) {
      chanceArray[i].percentChance = (((chanceArray[i].chance ?? chanceArray[i]) * PRECISION) / summedChance) * 100
      return chanceArray[i]
    }
  }
}

/**
 *
 * @param {
 *    serverSeed: server seed (private value show only after its changed from client fairness)
 *    clientSeed: public client seed
 *    gameSeed: game seed is available only after the game is finalized. (win, lost or withdrawn)
 *    nonce: Nonce from client fairness
 *    difficult: ['easy', 'medium', 'hard']
 *    maxLevel: max levels to be build based on fairness info provided
 * } param0
 * @returns
 */
const buildTowerMap = ({ serverSeed, clientSeed, gameSeed, nonce, difficult, maxLevel }) => {
  const towerChances = TOWER_POSSIBILITIES.map((_, idx) => ({ chance: 1 / TOWER_POSSIBILITIES.length, value: idx }))
  const towerMap = []
  for (let currentLevel = 0; currentLevel < maxLevel; currentLevel++) {
    const option = getRaffleChances(serverSeed, clientSeed, `${gameSeed}_${nonce}_${currentLevel}`, towerChances)
    const selectedLine = TOWER_POSSIBILITIES[option.value]
    towerMap.push(selectedLine.map(weight => (weight + 1) * 0.25 <= CHANCE_BY_DIFFICULT[difficult]))
  }
  return towerMap
}

const gameTowerFairness = { buildTowerMap }
module.exports = gameTowerFairness

// USAGE EXAMPLE
//
// console.log(
//   buildTowerMap({
//     serverSeed: "11gos8kx57zb8903219321830921jkfds798fids7i6fds8fds768fds568fd6s786fds",
//     clientSeed: "789fdsyh9f8ds79fsyf987sydf987s76fds9fydsfy9sd",
//     gameSeed: "98fds79fds9f87dsf98s7f9ds87fs",
//     nonce: 321,
//     difficult: "hard",
//     maxLevel: 5
//   })
// )
