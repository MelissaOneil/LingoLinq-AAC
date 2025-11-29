# files = []
# dirs = Dir.glob('*')
# incr = 0
# while dirs.length > 0
#   incr += 1
#   dir = dirs.pop
#   if dir.match(/^app/) && dir.match(/\.js$/) && dir != 'vendor.js' && dir != 'frontend.js'
#     files << dir
#   elsif !dir.match(/\./)
#     dirs += Dir.glob("#{dir}/*") unless dir.match(/node_modules|bower_components|test|dist|vendor/)
#   end
# end
# re = /: function\(\) \{/
# puts files.join("\n\t\t")
# files.each do |file|
#   puts file
#   str = File.read(file) rescue ""
#   orig_str = str.dup
#   continue = true
#   last_idx = 0
#   while continue
#     continue = false
#     prop_idx = str.index(/\}\.property\(/, last_idx)
#     last_idx = prop_idx
#     if prop_idx
#       func_idx = str.rindex(re, prop_idx)
#       if prop_idx && func_idx
#         str[prop_idx, 1] = "})"
#         str[func_idx, 2] = ": computed("
#         continue = true
#       end
#     end
#   end
#   if orig_str != str
#     puts "  **#{file}" 
#     File.write(file, str)
#   end
# end
