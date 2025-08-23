# Smart Contract CI/CD Pipeline

## How It Works

**NO MANUAL CONFIGURATION NEEDED!** 

1. **Drop any contract** into the `contracts/` folder
2. **Push to GitHub** - Your CI pipeline automatically:
   - Compiles the contract
   - Runs security checks
   - Deploys to blockchain
   - Verifies on Etherscan

## What Happens Automatically

- **Contract Discovery**: Script automatically finds ALL contracts in `contracts/` folder
- **Deployment**: Deploys every contract found (no manual naming)
- **Verification**: Automatically verifies on Etherscan
- **Summary**: Shows deployment results for all contracts

## For Your 100+ Contracts

Just add contracts to the `contracts/` folder and push. The pipeline handles everything:

```bash
# Add new contract
cp MyNewContract.sol contracts/

# Push to GitHub - CI/CD handles the rest!
git add .
git commit -m "Add new contract"
git push
```

## No More Manual Steps

- ❌ No environment variables to set
- ❌ No contract names to specify
- ❌ No manual deployment commands
- ✅ Just drop contracts and push!

## Current Contracts

Your pipeline will automatically deploy:
- `AGNT.sol` → AGNT contract
- `BoredApe.sol` → BoredApe contract
- Any future contracts you add

**That's it! Simple and automatic.**
