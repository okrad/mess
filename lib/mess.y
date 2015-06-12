/* description: Parses and executes css expressions. */
%left PLUS MINUS
%left MUL SLASH

%start stylesheet

%ebnf

%% /* language grammar */

stylesheet: S* vardecl* rule stylesheet {

		var styles = [];

		if($2) {
			styles.push({
				vars: $2
			});
		}

		if($3) {
			styles.push({
				rule: $3
			});
		}

		if($4 && Array.isArray($4)) {
			styles = styles.concat($4);
		}

		yy.setAST(styles);

	}
	| EOF
	;

rule: selectorlist LBRACE rulecontent+ RBRACE {

		if(!Array.isArray($3))
			$3 = [$3];

		$$ = {
			type: 'rule',
			selectors: $1,
			content: $3
		};
	};

rulecontent: vardecl
	| property
	| rule
	;

vardecl: ASSIGNMENT S* expr SEMICOLON {

		var varName = $1.substr(1),
			colonPos = varName.indexOf(':');

		if(colonPos != -1) {
			varName = varName.substr(0, colonPos);
			varName = varName.replace(/\s/, '');
		}

		$$ = {
			type: 'vardecl',
			name: varName,
			val: $3
		};

	};

property: PROPNAME expr SEMICOLON {
		$$ = {
			type: 'property',
			name: $1.substr(0, $1.indexOf(' ') - 1),
			val: $2
		}
	}
	;

selectorlist: selector {
		$$ = [$1];
	}
	| selector COMMA selectorlist {
		$$ = [$1];
		if($3)
			$$ = $$.concat($3);

	}
	;

selector: class combinator? S* selector? {
		$$ = $1;
		$$.combinator = $2 !== undefined ? $2 : $3.length > 0 ? 'descendant' : 'specificity';
		$$.relatedSelector = $4;
	}
	| hash combinator? S* selector? {
		$$ = $1;
		$$.combinator = $2 !== undefined ? $2 : $3.length > 0 ? 'descendant' : 'specificity';
		$$.relatedSelector = $4;
	}
	| tag combinator? S* selector? {
		$$ = $1;
		$$.combinator = $2 !== undefined ? $2 : $3.length > 0 ? 'descendant' : 'specificity';
		$$.relatedSelector = $4;
	}
	| selvar combinator? S* selector? {
		$$ = $1;
		$$.combinator = $2 !== undefined ? $2 : $3.length > 0 ? 'descendant' : 'specificity';
		$$.relatedSelector = $4;
	}
	| parentRef combinator? selector
	;

class: DOT ident pseudo? {
		$$ = {
			type: 'class',
			name: $2.trim(),
			pseudo: $3
		};
	}
	;

hash: HASH pseudo? {
		$$ = {
			type: 'id',
			name: $1.substr(1).trim(),
			pseudo: $2
		};
	}
	;

tag: ident pseudo? {
		$$ = {
			type: 'tag',
			name: $1.trim(),
			pseudo: $2
		};
	}
	;

selvar: DOLLARKEYWORD pseudo? {
		$$ = {
			type: 'var_reference',
			val: $1.substr(1),
			pseudo: $2
		};
	};

parentRef: AMPERSAND;

pseudo: PSEUDO_BEFORE {
		$$ = $1;
	}
	| PSEUDO_AFTER {
		$$ = $1;
	}
	;

combinator: GREATER {
		$$ = 'child';
	}
	| PLUS {
		$$ = 'next_sibling';
	}
	;
/*
properties: property {
		$$ = [$1];
	}
	| property S* properties {
		$$ = [$1];
		if($3)
			$$ = $$.concat($3);
	}
	;
*/

expr: term
	| term S+ expr {

		$$ = {
			type: 'term_sequence',
			val: [$1, $3]
		};

	}
	| term COMMA expr {

		$$ = {
			type: 'term_list',
			val: [$1]
		};

		if($3.type && $3.type == 'term_list') {
			$$.val = $$.val.concat($3.val);
		}
		else {
			$$.val.push($3);
		}


	}
	| math_expr
	| math_expr (S+)? expr {

		$$ = {
			type: 'term_sequence',
			val: [$1, $3]
		};

	}
	| math_expr COMMA expr {

		$$ = {
			type: 'term_list',
			val: [$1]
		};

		if($3.type && $3.type == 'term_list') {
			$$.val = $$.val.concat($3.val);
		}
		else {
			$$.val.push($3);
		}

/*
		$$ = {
			type: 'term_list',
			val: [$1, $3]
		};
*/

	}
	;

term: STRING {

		//Una stringa potrebbe contenere riferimenti a delle variabili, quindi la devo splittare

		$$ = {
			type: 'string',
			val: []
		};

		var lastIndex = 0,
			content = $1.slice(1, -1),
			re = /\{\$[^}]+\}/,
			matches;

		while(matches = content.match(re)) {

			if(matches.index > lastIndex) {
				$$.val.push({
					type: 'string_part',
					val: content.substr(lastIndex, matches.index - lastIndex)
				});
				lastIndex = matches.index;
			}

			$$.val.push({
				type: 'var_reference',
				val: matches[0].slice(2, -1)
			});

			content = content.substr(matches.index + matches[0].length);
		};

		if(content.length > 0) {
			$$.val.push({
				type: 'string_part',
				val: content
			});
		}

	}
	| IDENT {
		$$ = {
			type: 'keyword',
			val: $1
		};
	}
	;

math_expr: math_term {
	}
	| math_expr MUL math_expr {
		$$ = {
			type: 'math_expr',
			operand1: $1,
			operand2: $3,
			operator: 'mul'
		};
	}
	| math_expr SLASH math_expr {
		$$ = {
			type: 'math_expr',
			operand1: $1,
			operand2: $3,
			operator: 'div'
		};
	}
	| math_expr PLUS math_expr {
		$$ = {
			type: 'math_expr',
			operand1: $1,
			operand2: $3,
			operator: 'sum'
		};
	}
	| math_expr MINUS math_expr {
		$$ = {
			type: 'math_expr',
			operand1: $1,
			operand2: $3,
			operator: 'diff'
		};
	}
	| LPAR math_expr RPAR {
		$$ = $2;
	}
	;

math_term: PERCENTAGE {
		$$ = {
			type: 'percentage',
			val: parseFloat($1),
			um: '%',
			text: $1
		};
	}
	| DIMENSION {

		var val = parseFloat($1),
			um = $1.substr((val + "").length);

		$$ = {
			type: 'dimension',
			val: val,
			um: um,
			text: $1
		};
	}
	| NUMBER {
		$$ = {
			type: 'number',
			val: parseFloat($1),
			text: $1
		};
	}
	| DOLLARKEYWORD {
		$$ = {
			type: 'var_reference',
			val: $1.substr(1)
		};
	}
	| VAR_REFERENCE {
		$$ = {
			type: 'var_reference',
			val: $1.slice(2, -1)
		};
	}
	| function
	| COLOR {
		$$ = {
			type: 'color',
			val: $1
		};
	}
	;

function: FUNCTION expr? RPAR {
		$$ = {
		  type: 'function',
		  name: $1.slice(0, -1),
		  params: $2
		};
	}
	;

/*
vardecl: DOLLARKEYWORD COLON expr SEMICOLON {
		$$ = {
			name: $1.substr(1),
			val: $3
		};
	};
*/
ident: IDENT;
