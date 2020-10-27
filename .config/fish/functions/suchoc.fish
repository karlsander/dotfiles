function suchoc
	sudo touch $argv
	sudo /Applications/Chocolat.app/Contents/MacOS/Chocolat $argv ^ /dev/null > /dev/null
end
