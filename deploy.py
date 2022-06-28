# Import the os module
import os
import shutil
# Get the working directory
deploy_dir = os.path.dirname(os.path.realpath(__file__))

# Print the current working directory
print("deploy dir: {0}".format(deploy_dir))

os.chdir(deploy_dir)

enlisment_dir  = os.path.join("..","jagl_tmp")
os.system("rm -rf {0}".format(enlisment_dir))
git_clone_cmd = "git clone https://github.com/microsoft/msagljs {0}".format(enlisment_dir)
print("git cmd = {0}".format(git_clone_cmd))

# create an enlistment
os.system(git_clone_cmd)


os.chdir(enlisment_dir)
os.system("yarn")

sources = ["renderWithDeckGL","renderWithSVG" ]
targets = ["deck.gl_backend","svg_backend" ]



for x in range (0,2) :
   os.chdir(os.path.join(deploy_dir, enlisment_dir, "examples",sources[x]))
   print("current " + os.getcwd())
   os.system("npm run build") 
   target_path = os.path.join(deploy_dir, targets[x])
   shutil.rmtree(target_path)
   shutil.copytree("dist", target_path)

os.system("rm -rf {0}".format(os.path.join(deploy_dir, enlisment_dir)))
