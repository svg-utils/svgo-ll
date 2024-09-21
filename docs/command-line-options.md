# Command Line Options

`-v, --version`  
Output the version number.

`-i, --input <INPUT...>`  
One or more input files to process. Use "-" to take input from STDIN.

`-s, --string <STRING>`  
Process an input file specified as a string.

`-f, --folder <FOLDER>`  
Process all \*.svg files in the specified folder.

`-o, --output <OUTPUT...>`  
File or folder to which output should be written. If no output option is specified, the input file will be overwritten by the processed result. Use "-" to write output to STDOUT.

`--preset <default | next | none>`  
Specify which set of predefined plugins to use. If this option is not used, and no plugins are define by the `--config` option,
[preset-default](./preset-default.md) is used.

`--config <CONFIG>`  
Custom configuration file.

`--enable <plugin...>`  
Specify one or more builtin plugins to run in addition to those specified by `--preset` or `--config`.

`--disable <plugin...>`  
Specify one or more plugins specified by `--preset` or `--config` which should not be run.

`--datauri <base64 | enc | unenc>`  
Output as Data URI string (base64), URI encoded (enc) or unencoded (unenc) rather than .svg.

`--max-passes <INTEGER>`  
Maximum number of iterations over the plugins. Must be an integer between 1 and 10. Default is 10.

`--pretty`  
Add line breaks and indentation to output.

`--indent <INTEGER>`  
Number of spaces to indent if `--pretty` is specified. Default is 4.

`--eol <lf | crlf>`  
Line break to use when outputting SVG. If unspecified, the platform default is used.

`--final-newline`  
Ensure output ends with a line break.

`-r, --recursive`  
If `--folder` is specified, process files in all sub-folders recursively.

`--exclude <PATTERN...>`  
If `--folder` is specified, exclude files matching any of the specified regular expression patterns.

`-q, --quiet`  
Only output error messages, not regular status messages.

`--show-plugins`
Show available plugins and exit.

`--no-color`  
Output messages in plain text without color.

`-h, --help`  
Display help for command line options.

## Syntax

If an option has exactly one value, it can be expressed either with or without an `=`, for example as `-i test.svg` or `-i=test.svg`.

If an option has more than one value it can be expressed by followin the argument with the values separated by spaces,
for example as `-i test1.svg test2.svg`.
