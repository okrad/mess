/* description: Parses and executes css expressions. */

%lex
%options case-insensitive

digit [0-9]
ident [-]?{nmstart}{nmchar}*
name  {nmchar}+
nmstart [_a-z]|{nonascii}|{escape}
nonascii  [^\0-\237]
unicode "\\"[0-9a-f]{1,6}(\r\n|[ \n\r\t\f])?
escape  {unicode}|\\[^\n\r\f0-9a-f]
nmchar  [_a-z0-9-]|{nonascii}|{escape}
num     {digit}*"."{digit}+ | {digit}+
string  {string1}|{string2}
string1 "\""([^\n\r\f\\"]|"\\"{nl}|{escape})*"\""
string2 "'"([^\n\r\f\\']|\\{nl}|{escape})*"'"
badstring {badstring1}|{badstring2}
badstring1  "\""([^\n\r\f\\"]|"\\"{nl}|{escape})*"\\"?
badstring2  "'"([^\n\r\f\\']|"\\"{nl}|{escape})*"\\"?
nl  \n|\r\n|\r|\f
s [ \t]*
w [ \t\r\n\f]*

%%

{w}"/""*"([^*]*("*"[^/])*[^*]*)*"*""/"{w}  	/* ignore comments */
{w}"/""/"[^\n]*{w}							/* ignore comments */
{string}                                return 'STRING';
{badstring}                             return 'BAD_STRING';
{ident}"("                              return 'FUNCTION';
{ident}{s}":"{s}						return 'PROPNAME';
{ident}                                 return 'IDENT';
"$"{ident}{s}":"						return 'ASSIGNMENT';
"$"{ident}                              return 'DOLLARKEYWORD';
"@"{ident}                              return 'ATKEYWORD';
"{$"{ident}"}"                          return 'VAR_REFERENCE';
"#"[a-f0-9]{3,6}                        return 'COLOR';
"#"{name}                               return 'HASH';
{num}"%"                                return 'PERCENTAGE';
{num}{ident}                            return 'DIMENSION';
{num}                                   return 'NUMBER';
"u\+"[0-9a-f?]{1,6}(-[0-9a-f]{1,6})?    return 'UNICODE-RANGE';
"."                                     return 'DOT';
{w}":"{w}                               return 'COLON';
{w}";"{w}                               return 'SEMICOLON';
{w}"{"{w}                               return 'LBRACE';
{w}"}"{w}                               return 'RBRACE';
{w}"("{w}                               return 'LPAR';
{w}")"{w}                               return 'RPAR';
{w}"["{w}	                            return 'LSQUARE';
{w}"]"{w}                               return 'RSQUARE';
{w}","{w}                               return 'COMMA';
{w}"/"{w}                               return 'SLASH';
{w}"-"{w}                               return 'MINUS';
{w}"+"{w}                               return 'PLUS';
{w}"*"{w}                               return 'MUL';
{w}">"{w}                               return 'GREATER';
"~="                                    return 'INCLUDES';
"|="                                    return 'DASHMATCH';
{w}"="{w}                               return 'ASSIGN';
":before"                               return 'PSEUDO_BEFORE';
":after"                                return 'PSEUDO_AFTER';
{w}<<EOF>>                              return 'EOF';
{w}                                     return 'S';
{nl}+									return 'NL';
.                                       return 'DELIM';

