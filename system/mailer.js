const path = require('path')
const fs = require('fs')
const Walker = require('walk')
const Mustache = require('mustache')
const Cheerio = require('cheerio')

const Locale = require('./locale.js')

const { Attr } = require('./util.js')

// TODO: Make mailer use the theme folder (mailer.theme(string name))
// TODO: Make an opt out using some external MessageQueue to send emails.
// Because from what I can see SMTP takes a lot of time to send email to users.

const Juice = require('juice')

class Mailer {
  constructor(site) {
    let view = this.variables = {}

    view.self = {}
    // TODO: Use host from site attribute :).
    view.self.host = 'http://localhost'

    view.string = site.locale.get()

    view.locale = {}

    view.locale.name = view.locale.tag = site.attribute.locale.default

    let [language, region] = view.locale.tag.split('-')

    view.locale.language = language
    view.locale.region = region || language

    view.locale.tag = Locale.format(view.locale.tag)

    let directory = this.directory = path.join(site.directory, 'mailer')

    // console.log('Mailer directory:', this.directory)

    let templates = this.templates = {}

    if (fs.existsSync(this.directory)) {
      let templates = []

      let walker = Walker.walkSync(this.directory, {
        listeners: {

          file: (root, stats) => {
            let file = path.parse(stats.name)
            if (['.html'].includes(file.ext)) {
              templates.push(path.join(root, file.name))
            }
          }

        }
      })

      for (let directory of templates) {
        let template = directory.replace(path.join(this.directory, path.sep), '').replace(/\\+/, '/')
        this.templates[template] = require(directory)
      }
    }

    let messanger = class MailerMessage {
      constructor(template) {
        this.template = templates[template]

        if (!this.template) {
          throw new Error( 'Could not locate the Mailer template in: ' + (path.join(directory.replace(process.cwd(), ''), template)) )
        }

        this.data = {}

        this.variables = JSON.parse(JSON.stringify(view))
      }

      view(object) {
        this.variables = Attr.default(
          this.variables,
          object
        )
      }

      destroy() {
        delete this.view
        delete this.data
      }

      async send(transporter = site.transporter.get()) {
        this.data.html = this.data.html || Mustache.render(this.template, this.variables, templates)

        let $ = Cheerio.load(this.data.html)

        let title = $('head title').text()

        this.data.subject = this.data.subject || title

        this.data.text = $('body').text()

        this.data.html = Juice.juiceDocument($).html()

        let result = transporter.sendMail(this.data)

        this.destroy()

        return result
      }

      locale(name) {
        let locale = site.locale.get(name)

        if (locale) {
          this.variables.string = Attr.default(
            this.variables.string,
            locale
          )

          this.variables.locale = {}

          this.variables.locale.name = this.variables.locale.tag = name

          let [language, region] = this.variables.locale.tag.split('-')

          this.variables.locale.language = language
          this.variables.locale.region = region || language

          this.variables.locale.tag = Locale.format(this.variables.locale.tag)
        }
      }

      to(destination) {
        if (!Array.isArray(destination)) {
          destination = [destination]
        }

        this.data.to = destination.join(', ')
      }

      set(key, value) {
        this.variables[key] = value
      }

      subject(data) {
        this.data.subject = data
      }

      text(data) {
        this.data.text = data
      }

      from(data) {
        this.data.from = data
      }

      html(data) {
        this.data.html = data
      }
    }

    messanger.transporter = site.transporter

    return messanger
  }
}

module.exports = Mailer
