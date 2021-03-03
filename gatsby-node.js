const path = require("path")
const fs = require("fs")
const chokidar = require("chokidar");

let onCreateWebpackConfigCallCount = 0;

const replaceWebpackConfig = (actions, getConfig, alias, extensions) => {
  const initAlias = getConfig().resolve.alias;
  const initExtensions = getConfig().resolve.extensions;

  const argAlias = {};
  for (const [key, value] of Object.entries(alias)) argAlias[key] = path.isAbsolute(value) ? value : path.resolve(value);
  const argExtensions = extensions;

  const replaceAlias = { ...initAlias, ...argAlias };
  const replaceExtensions = [...new Set([...initExtensions, ...argExtensions])];
  const replaceConfig = { ...getConfig(), ...{ resolve: { alias: replaceAlias, extensions: replaceExtensions } } };

  actions.replaceWebpackConfig(replaceConfig);
}

const updateVsCodeJsconfigJson = () => {
  setTimeout(() => {
    try {
      // Read: gatsby-config.js
      delete require.cache[path.resolve("gatsby-config.js")];
      const readConfig = require(path.resolve("gatsby-config.js")).plugins;
      const nowMyConfig = readConfig.find((config) => config.resolve === "gatsby-plugin-alias-vscode").options.alias;
      
      // Read: jsconfig.json
      const jsConfig = fs.existsSync(path.resolve("jsconfig.json"))
        ? JSON.parse(fs.readFileSync(path.resolve("jsconfig.json"), "utf8"))
        : { compilerOptions: { baseUrl: "./", paths: {} } };
    
      // Convert: {key: value} -> {'key/*': 'value/*'}
      const aliasConvertStr = {};
      for (const [key, value] of Object.entries(nowMyConfig)) {
        aliasConvertStr[`${key}/*`] = [`${value}/*`];
      }
    
      // Update: jsconfig.json
      jsConfig.compilerOptions.paths = aliasConvertStr;
      fs.writeFileSync(path.resolve("jsconfig.json"), JSON.stringify(jsConfig, null, "    "));
      
    } catch (e) {
      console.log("plugin info:");
      console.log("------------------------------------------------------------------------------------------------------------------------------");
      console.log(e);
      console.log("------------------------------------------------------------------------------------------------------------------------------");
    }
  }, 1);
}

const updateVsCodeSettingsJson = () => {
  fs.existsSync(path.resolve(".vscode")) || fs.mkdirSync(path.resolve(".vscode"))
  
  // add settings.json
  const json = fs.existsSync(path.resolve(".vscode/settings.json"))
    ? // jsonFile found.
      {
        ...JSON.parse(fs.readFileSync("./.vscode/settings.json", "utf8")),
        "javascript.preferences.importModuleSpecifier": "non-relative"
      }
    : // jsonFile not found
      { "javascript.preferences.importModuleSpecifier": "non-relative" };
  fs.writeFileSync(path.resolve(".vscode/settings.json"), JSON.stringify(json, null, "    ")); 
}

const updateGitignore = () => {   
  console.log(path.resolve(".gitignore"))
  const addText = (textArr = []) => {
    const addStrArr = ["#VS Code", ".vscode/", "jsconfig.json", ""];
    addStrArr.forEach((addStr) => textArr.push(addStr));
    fs.writeFileSync(path.resolve(".gitignore"), textArr.join("\r\n"));
  };
  
  try {
    const textArr = fs.readFileSync(path.resolve(".gitignore")).toString().split("\r\n");
    if (!textArr.find((text) => text === "#VS Code")) {
      addText(textArr);
    }
  } catch (e) {
    console.log(".gitignore not found.")
    console.log("make gitignore.")
    addText();
  }
}

exports.onCreateWebpackConfig = ({ actions, getConfig }, { alias = {}, extensions = [] }) => {
  if (onCreateWebpackConfigCallCount === 1) {
    console.log("plugin info : onCreateWebpackConfig");

    replaceWebpackConfig(actions, getConfig, alias, extensions)

    updateVsCodeJsconfigJson()
    updateVsCodeSettingsJson()
    updateGitignore()

    chokidar.watch(path.resolve("gatsby-config.js"), { ignored: /[\\/\\\\]\./, persistent: true })
    .on("change", () => {
      updateVsCodeJsconfigJson()
    })
    .on("add", () => {
      updateVsCodeJsconfigJson()
    });
  }
  onCreateWebpackConfigCallCount++;
};

