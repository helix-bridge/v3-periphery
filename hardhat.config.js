require("@nomiclabs/hardhat-waffle");
require('hardhat-abi-exporter');
require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");


require('dotenv').config({ path: '.env' })
const fs = require("fs")

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY 

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  mocha: {
    timeout: 1000000
  },
  solidity: {
    compilers: [
      {
        version: "0.7.6",
        settings: {
          //evmVersion: "london",
          optimizer: {
            enabled: true,
            runs: 200
          },
          outputSelection: {
            "*": {
              "*": [
                "abi",
                "devdoc",
                "metadata",
                "evm.bytecode.object",
                "evm.bytecode.sourceMap",
                "evm.deployedBytecode.object",
                "evm.deployedBytecode.sourceMap",
                "evm.methodIdentifiers"
              ],
              "": ["ast"]
            }
          }
        }
      },
      {
        version: "0.4.24",
        settings: {
          evmVersion: "byzantium",
          optimizer: {
            enabled: true,
            runs: 999999
          },
        }
      }
    ]
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      blockGasLimit: 10000000,
      accounts: [
          {
              privateKey: "10abcdef10abcdef10abcdef10abcdef10abcdef10abcdef10abcdef10abcdef",
              balance: "100000000000000000000000",
          },
          {
              privateKey: "20abcdef10abcdef10abcdef10abcdef10abcdef10abcdef10abcdef10abcdef",
              balance: "100000000000000000000000",
          },
          {
              privateKey: "30abcdef10abcdef10abcdef10abcdef10abcdef10abcdef10abcdef10abcdef",
              balance: "100000000000000000000000",
          },
          {
              privateKey: "40abcdef10abcdef10abcdef10abcdef10abcdef10abcdef10abcdef10abcdef",
              balance: "100000000000000000000000",
          },
      ]
    },
    dev: {
      url: 'http://localhost:8545/',
      network_id: "*",
    },
    blast_sepolia: {
      url: 'https://sepolia.blast.io'
    },
    taiko_testnet: {
      url: 'https://rpc.katla.taiko.xyz'
    },
    bitlayertestnet: {
      url: 'https://testnet-rpc.bitlayer.org', 
      chainId: 200810
    },
  },
  etherscan: {
    apiKey: {
      bitlayertestnet: "1234",
      bitlayer: "1234"
    },
    customChains: [
      {
        network: "bitlayertestnet",
        chainId: 200810,
        urls: {
          apiURL: "https://api-testnet.btrscan.com/scan/api",
          browserURL: "https://testnet.btrscan.com/"
        }
      },
      {
        network: "blast_sepolia",
        chainId: 168587773,
        urls: {
          apiURL: "https://api.routescan.io/v2/network/testnet/evm/168587773/etherscan",
          browserURL: "https://testnet.blastscan.io"
        }
      },
      {
        network: "taiko_testnet",
        chainId: 167008,
        urls: {
          apiURL: "https://blockscoutapi.katla.taiko.xyz/api?module=contract&action=verify",
          browserURL: "https://explorer.katla.taiko.xyz/"
        }
      }

    ]    
  },
  abiExporter: {
    path: './abi/',
    clear: false,
    flat: false,
    only: [],
  }
};


function getSortedFiles(dependenciesGraph) {
    const tsort = require("tsort")
    const graph = tsort()

    const filesMap = {}
    const resolvedFiles = dependenciesGraph.getResolvedFiles()
    resolvedFiles.forEach((f) => (filesMap[f.sourceName] = f))

    for (const [from, deps] of dependenciesGraph.entries()) {
        for (const to of deps) {
            graph.add(to.sourceName, from.sourceName)
        }
    }

    const topologicalSortedNames = graph.sort()

    // If an entry has no dependency it won't be included in the graph, so we
    // add them and then dedup the array
    const withEntries = topologicalSortedNames.concat(resolvedFiles.map((f) => f.sourceName))

    const sortedNames = [...new Set(withEntries)]
    return sortedNames.map((n) => filesMap[n])
}

function getFileWithoutImports(resolvedFile) {
    const IMPORT_SOLIDITY_REGEX = /^\s*import(\s+)[\s\S]*?;\s*$/gm

    return resolvedFile.content.rawContent.replace(IMPORT_SOLIDITY_REGEX, "").trim()
}

subtask("flat:get-flattened-sources", "Returns all contracts and their dependencies flattened")
    .addOptionalParam("files", undefined, undefined, types.any)
    .addOptionalParam("output", undefined, undefined, types.string)
    .setAction(async ({ files, output }, { run }) => {
        const dependencyGraph = await run("flat:get-dependency-graph", { files })
        console.log(dependencyGraph)

        let flattened = ""

        if (dependencyGraph.getResolvedFiles().length === 0) {
            return flattened
        }

        const sortedFiles = getSortedFiles(dependencyGraph)

        let isFirst = true
        for (const file of sortedFiles) {
            if (!isFirst) {
                flattened += "\n"
            }
            flattened += `// File ${file.getVersionedName()}\n`
            flattened += `${getFileWithoutImports(file)}\n`

            isFirst = false
        }

        // Remove every line started with "// SPDX-License-Identifier:"
        flattened = flattened.replace(/SPDX-License-Identifier:/gm, "License-Identifier:")
        flattened = flattened.replace(/pragma solidity [\^>=0-9.]*;\n/gm, "")
        flattened = flattened.replace(/pragma solidity [\^><=0-9.\s]*;\n/gm, "")

        flattened = `pragma solidity ^0.7.6;\n\n${flattened}`
        flattened = `// SPDX-License-Identifier: MIT\n\n${flattened}`

        // Remove every line started with "pragma experimental ABIEncoderV2;" except the first one
        flattened = flattened.replace(/pragma experimental ABIEncoderV2;\n/gm, ((i) => (m) => (!i++ ? m : ""))(0))

        flattened = flattened.trim()
        if (output) {
            console.log("Writing to", output)
            fs.writeFileSync(output, flattened)
            return ""
        }
        return flattened
    })

subtask("flat:get-dependency-graph")
    .addOptionalParam("files", undefined, undefined, types.any)
    .setAction(async ({ files }, { run }) => {
        const sourcePaths = files === undefined ? await run("compile:solidity:get-source-paths") : files.map((f) => fs.realpathSync(f))

        const sourceNames = await run("compile:solidity:get-source-names", {
            sourcePaths,
        })

        const dependencyGraph = await run("compile:solidity:get-dependency-graph", { sourceNames })

        return dependencyGraph
    })

task("flat", "Flattens and prints contracts and their dependencies")
    .addOptionalVariadicPositionalParam("files", "The files to flatten", undefined, types.inputFile)
    .addOptionalParam("output", "Specify the output file", undefined, types.string)
    .setAction(async ({ files, output }, { run }) => {
        console.log(
            await run("flat:get-flattened-sources", {
                files,
                output,
            })
        )
    })
