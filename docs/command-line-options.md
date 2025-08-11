# Command Line Options

For examples of how these options can be used, see the [FAQ](./faq.md).

## Input Options

`-i, --input <INPUT...>`  
One or more input files to process. Use "-" to take input from STDIN.

`-s, --string <STRING>`  
Process an input file specified as a string.

`-f, --folder <FOLDER>`  
Process all \*.svg files in the specified folder.

`-r, --recursive`  
If `--folder` is specified, process files in all sub-folders recursively.

`--exclude <PATTERN...>`  
If `--folder` is specified, exclude files matching any of the specified regular expression patterns.

<a id="plugins"></a>

## Plugin and Compression Options

<a id="preset"></a>
`--preset <default | next | none>`  
Specify which set of predefined plugins to use. If this option is not used, and no plugins are define by the `--config` option,
[preset-default](./preset-default.md) is used.

<a id="enable"></a>
`--enable <plugin...>`  
Specify one or more builtin plugins to run in addition to those specified by `--preset` or `--config`.

<a id="options"></a>
` --options <FILENAME>`  
Path to a [JSON file](https://www.json.org) containing configuration parameters for enabled plugins. The JSON file should contain an object whose keys are the names of plugins, and whose values are the parameters to pass to that plugin. This option cannot be used if the [`--config` option](#config) is specified.

<a id="disable"></a>
`--disable <plugin...>`  
Specify one or more plugins specified by `--preset` or `--config` which should not be run.

<a id="config"></a>
`--config <FILENAME>`  
Specifies a [custom configuration file](./custom-config-file.md).

<a id="max-passes"></a>

`--max-passes <INTEGER>`  
Maximum number of iterations over the plugins. Must be an integer between 1 and 10. Default is 10.

## Output Options

`-o, --output <OUTPUT...>`  
File or folder to which output should be written. If no output option is specified, the input file will be overwritten by the processed result. Use "-" to write output to STDOUT.

`--datauri <base64 | enc | unenc>`  
Output as Data URI string (base64), URI encoded (enc) or unencoded (unenc) rather than .svg.

`--pretty`  
Add line breaks and indentation to output.

`--indent <INTEGER>`  
Number of spaces to indent if `--pretty` is specified. Default is 4.

`--eol <lf | crlf>`  
Line break to use when outputting SVG. If unspecified, the platform default is used.

`--final-newline`  
Ensure output ends with a line break.

`--no-color`  
Output messages in plain text without color.

`-q, --quiet`  
Only output error messages, not regular status messages.

## Help Options

`--show-plugins`
Show available plugins and exit.

`-v, --version`  
Output the version number.

`-h, --help`  
Display help for command line options.

## Syntax

If an option has exactly one value, it can be expressed either with or without an `=`, for example as `-i test.svg` or `-i=test.svg`.

If an option has more than one value it can be expressed by followin the argument with the values separated by spaces,
for example as `-i test1.svg test2.svg`.
