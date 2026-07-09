package com.cloudstorage.backend.service;

import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class SearchQueryParserService {

    public interface SearchNode {}

    public static class AndNode implements SearchNode {
        private final List<SearchNode> children;
        public AndNode(List<SearchNode> children) { this.children = children; }
        public List<SearchNode> getChildren() { return children; }
        @Override
        public String toString() { return "AND" + children; }
    }

    public static class OrNode implements SearchNode {
        private final List<SearchNode> children;
        public OrNode(List<SearchNode> children) { this.children = children; }
        public List<SearchNode> getChildren() { return children; }
        @Override
        public String toString() { return "OR" + children; }
    }

    public static class NotNode implements SearchNode {
        private final SearchNode child;
        public NotNode(SearchNode child) { this.child = child; }
        public SearchNode getChild() { return child; }
        @Override
        public String toString() { return "NOT(" + child + ")"; }
    }

    public static class FieldNode implements SearchNode {
        private final String field;
        private final String operator; // ":", ">", "<"
        private final String value;
        public FieldNode(String field, String operator, String value) {
            this.field = field.toLowerCase();
            this.operator = operator;
            this.value = value;
        }
        public String getField() { return field; }
        public String getOperator() { return operator; }
        public String getValue() { return value; }
        @Override
        public String toString() { return field + operator + value; }
    }

    public static class TermNode implements SearchNode {
        private final String term;
        private final boolean isExact;
        public TermNode(String term, boolean isExact) {
            this.term = term;
            this.isExact = isExact;
        }
        public String getTerm() { return term; }
        public boolean isExact() { return isExact; }
        @Override
        public String toString() { return isExact ? "\"" + term + "\"" : term; }
    }

    private enum TokenType {
        LPAREN, RPAREN, AND, OR, NOT, FIELD_TERM, PHRASE, BARE_TERM, EOF
    }

    private static class Token {
        final TokenType type;
        final String text;
        final String extra1; // Used for field name
        final String extra2; // Used for operator

        Token(TokenType type, String text) {
            this(type, text, null, null);
        }

        Token(TokenType type, String text, String extra1, String extra2) {
            this.type = type;
            this.text = text;
            this.extra1 = extra1;
            this.extra2 = extra2;
        }

        @Override
        public String toString() {
            return type + (text != null ? ":" + text : "");
        }
    }

    public SearchNode parse(String query) {
        if (query == null || query.trim().isEmpty()) {
            return new AndNode(new ArrayList<>());
        }
        List<Token> tokens = lex(query);
        Parser parser = new Parser(tokens);
        return parser.parse();
    }

    private List<Token> lex(String query) {
        List<Token> tokens = new ArrayList<>();
        int i = 0;
        int len = query.length();

        Pattern fieldPattern = Pattern.compile("^(filename|owner|tag|category|type|size|date|ocr|starred|deleted|shared|public|permission|favorite|recent|duplicate|large|trash|versioned|comment|mention|uploaded|modified|extension|mime|workspace)([:<>])", Pattern.CASE_INSENSITIVE);

        while (i < len) {
            char c = query.charAt(i);
            if (Character.isWhitespace(c)) {
                i++;
                continue;
            }

            if (c == '(') {
                tokens.add(new Token(TokenType.LPAREN, "("));
                i++;
                continue;
            }
            if (c == ')') {
                tokens.add(new Token(TokenType.RPAREN, ")"));
                i++;
                continue;
            }

            if (c == '"') {
                int start = i + 1;
                int end = start;
                while (end < len && query.charAt(end) != '"') {
                    end++;
                }
                if (end < len) {
                    tokens.add(new Token(TokenType.PHRASE, query.substring(start, end)));
                    i = end + 1;
                } else {
                    tokens.add(new Token(TokenType.BARE_TERM, query.substring(start)));
                    i = len;
                }
                continue;
            }

            // Check if it's a field search term
            String remaining = query.substring(i);
            Matcher matcher = fieldPattern.matcher(remaining);
            if (matcher.find()) {
                String fieldName = matcher.group(1);
                String operator = matcher.group(2);
                int fieldPrefixLen = matcher.end();
                i += fieldPrefixLen;

                // Lex the value of the field
                if (i < len && query.charAt(i) == '"') {
                    int start = i + 1;
                    int end = start;
                    while (end < len && query.charAt(end) != '"') {
                        end++;
                    }
                    String val = (end < len) ? query.substring(start, end) : query.substring(start);
                    tokens.add(new Token(TokenType.FIELD_TERM, val, fieldName, operator));
                    i = (end < len) ? end + 1 : len;
                } else {
                    int start = i;
                    while (i < len && !Character.isWhitespace(query.charAt(i)) && query.charAt(i) != ')' && query.charAt(i) != '(') {
                        i++;
                    }
                    String val = query.substring(start, i);
                    tokens.add(new Token(TokenType.FIELD_TERM, val, fieldName, operator));
                }
                continue;
            }

            // Scan general word
            int start = i;
            while (i < len && !Character.isWhitespace(query.charAt(i)) && query.charAt(i) != ')' && query.charAt(i) != '(') {
                i++;
            }
            String word = query.substring(start, i);
            String upper = word.toUpperCase();

            if (upper.equals("AND") || word.equals("&&")) {
                tokens.add(new Token(TokenType.AND, word));
            } else if (upper.equals("OR") || word.equals("||")) {
                tokens.add(new Token(TokenType.OR, word));
            } else if (upper.equals("NOT") || word.equals("!")) {
                tokens.add(new Token(TokenType.NOT, word));
            } else {
                tokens.add(new Token(TokenType.BARE_TERM, word));
            }
        }
        tokens.add(new Token(TokenType.EOF, null));
        return tokens;
    }

    private static class Parser {
        private final List<Token> tokens;
        private int pos = 0;

        Parser(List<Token> tokens) {
            this.tokens = tokens;
        }

        private Token peek() {
            return tokens.get(pos);
        }

        private Token consume() {
            Token t = peek();
            if (t.type != TokenType.EOF) {
                pos++;
            }
            return t;
        }

        SearchNode parse() {
            SearchNode node = parseOr();
            if (peek().type != TokenType.EOF) {
                // Return implicit AND of what we parsed so far and the remainder
                List<SearchNode> children = new ArrayList<>();
                children.add(node);
                while (peek().type != TokenType.EOF) {
                    children.add(parseOr());
                }
                return new AndNode(children);
            }
            return node;
        }

        private SearchNode parseOr() {
            SearchNode left = parseAnd();
            while (peek().type == TokenType.OR) {
                consume(); // consume OR
                SearchNode right = parseAnd();
                if (left instanceof OrNode) {
                    ((OrNode) left).getChildren().add(right);
                } else {
                    List<SearchNode> children = new ArrayList<>();
                    children.add(left);
                    children.add(right);
                    left = new OrNode(children);
                }
            }
            return left;
        }

        private SearchNode parseAnd() {
            SearchNode left = parseImplicitAnd();
            while (peek().type == TokenType.AND) {
                consume(); // consume AND
                SearchNode right = parseImplicitAnd();
                if (left instanceof AndNode) {
                    ((AndNode) left).getChildren().add(right);
                } else {
                    List<SearchNode> children = new ArrayList<>();
                    children.add(left);
                    children.add(right);
                    left = new AndNode(children);
                }
            }
            return left;
        }

        private SearchNode parseImplicitAnd() {
            SearchNode left = parseNot();
            while (isNextImplicitAndStart()) {
                SearchNode right = parseNot();
                if (left instanceof AndNode) {
                    ((AndNode) left).getChildren().add(right);
                } else {
                    List<SearchNode> children = new ArrayList<>();
                    children.add(left);
                    children.add(right);
                    left = new AndNode(children);
                }
            }
            return left;
        }

        private boolean isNextImplicitAndStart() {
            TokenType t = peek().type;
            return t == TokenType.LPAREN || t == TokenType.NOT || t == TokenType.FIELD_TERM || t == TokenType.PHRASE || t == TokenType.BARE_TERM;
        }

        private SearchNode parseNot() {
            if (peek().type == TokenType.NOT) {
                consume();
                return new NotNode(parsePrimary());
            }
            return parsePrimary();
        }

        private SearchNode parsePrimary() {
            Token t = peek();
            switch (t.type) {
                case LPAREN:
                    consume();
                    SearchNode expr = parseOr();
                    if (peek().type == TokenType.RPAREN) {
                        consume();
                    }
                    return expr;
                case FIELD_TERM:
                    consume();
                    String parsedVal = t.text;
                    if (t.extra1.equalsIgnoreCase("size")) {
                        parsedVal = String.valueOf(parseSizeToBytes(t.text));
                    } else if (t.extra1.equalsIgnoreCase("date")) {
                        parsedVal = parseDateToIsoString(t.text);
                    }
                    return new FieldNode(t.extra1, t.extra2, parsedVal);
                case PHRASE:
                    consume();
                    return new TermNode(t.text, true);
                case BARE_TERM:
                    consume();
                    return new TermNode(t.text, false);
                default:
                    // Fallback empty term
                    return new TermNode("", false);
            }
        }

        private long parseSizeToBytes(String sizeStr) {
            if (sizeStr == null || sizeStr.isEmpty()) return 0;
            String clean = sizeStr.replaceAll("[\\s,]", "").toUpperCase();
            Pattern p = Pattern.compile("^(\\d+)(B|KB|MB|GB|TB)?$");
            Matcher m = p.matcher(clean);
            if (m.matches()) {
                long num = Long.parseLong(m.group(1));
                String unit = m.group(2);
                if (unit == null) return num;
                switch (unit) {
                    case "KB": return num * 1024;
                    case "MB": return num * 1024 * 1024;
                    case "GB": return num * 1024 * 1024 * 1024;
                    case "TB": return num * 1024 * 1024 * 1024 * 1024L;
                    default: return num;
                }
            }
            try {
                return Long.parseLong(clean);
            } catch (Exception e) {
                return 0;
            }
        }

        private String parseDateToIsoString(String dateStr) {
            if (dateStr == null || dateStr.isEmpty()) return dateStr;
            try {
                // If it is just yyyy-MM-dd
                LocalDate ld = LocalDate.parse(dateStr, DateTimeFormatter.ISO_LOCAL_DATE);
                return ld.toString();
            } catch (Exception e) {
                return dateStr;
            }
        }
    }
}
