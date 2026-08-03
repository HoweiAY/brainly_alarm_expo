require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'AlarmScheduler'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license'] || ''
  s.author         = package['author'] || ''
  s.homepage       = package['homepage'] || ''
  s.platforms      = {
    :ios => '15.1'
  }
  s.source         = { git: '' }
  s.dependency 'ExpoModulesCore'
  s.source_files = "**/*.{h,m,swift}"
end
