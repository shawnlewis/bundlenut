from google.appengine.ext.webapp import template
django_template = template.django.template
register = template.create_template_register()

class VerbatimNode(django_template.Node):
    def __init__(self, text):
        self.text = text
    
    def render(self, context):
        return self.text

@register.tag
def verbatim(parser, token):
    text = []
    while 1:
        token = parser.tokens.pop(0)
        if token.contents == 'endverbatim':
            break
        if token.token_type == django_template.TOKEN_VAR:
            text.append('{{')
        elif token.token_type == django_template.TOKEN_BLOCK:
            text.append('{%')
        text.append(token.contents)
        if token.token_type == django_template.TOKEN_VAR:
            text.append('}}')
        elif token.token_type == django_template.TOKEN_BLOCK:
            text.append('%}')
    return VerbatimNode(''.join(text))
