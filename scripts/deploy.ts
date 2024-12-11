import { ethers } from "hardhat";
import { Contract } from "ethers";

async function main() {
  // Contract details
  const CONTRACT_NAME = "CAT721";
  const CONTRACT_SYMBOL = "CAT";
  
  // Deploy the CAT721 contract
  console.log("Deploying CAT721 contract...");

  const CAT721Factory = await ethers.getContractFactory("CAT721");
  const cat721 = (await CAT721Factory.deploy(CONTRACT_NAME, CONTRACT_SYMBOL)) as Contract;

  await cat721.deployed();

  console.log(`CAT721 deployed to: ${cat721.address}`);
  console.log(`Name: ${CONTRACT_NAME}`);
  console.log(`Symbol: ${CONTRACT_SYMBOL}`);
}

// Main function to execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
