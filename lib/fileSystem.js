"use strict"

/**
 * Provides functions to interact with the file system.
 *
 * @module fileSystem
 * @class fileSystem
 * @main fileSystem
 */

// Module dependencies
var fs = require("fs");
var path = require("path");
var tar = require("tar");

/**
 * Extracts a tar file to the given directory.
 * 
 * @method extract
 * @async
 * @param {String} filePath Path of the file to extract
 * @param {String} destinationPath Path of the directory where to
 * extract files
 * @param {Function} callback The function to call when done
 *   - **Error** The error if an error occurred, null otherwise
 */
module.exports.extract = function(filePath, destinationPath, callback){
  
  function onError(error){
    callback(error);
  }
  
  if(filePath && destinationPath && callback){
  
    // Prepare the extractor with destination path
    var extractor = tar.Extract(
      {path: path.normalize(destinationPath)}
    );

    // Handle extraction end
    extractor.on("end", function(){
      callback();
    });

    var tarFileReadableStream = fs.createReadStream(path.normalize(filePath));

    // Handle errors
    tarFileReadableStream.on("error", onError);
    extractor.on("error", onError);        

    // Extract file
    tarFileReadableStream.pipe(extractor); 
    
  }
}

/**
 * Copies a file from one directory into another.
 * 
 * @method copy
 * @async
 * @param {String} sourceFilePath Path of the file to move
 * @param {String} destinationFilePath Final path of the file
 * @param {Function} callback The function to call when done
 *   - **Error** The error if an error occurred, null otherwise
 */
module.exports.copy = function(sourceFilePath, destinationFilePath, callback){
  
  function onError(error){
    callback(error);
  }
  
  if(sourceFilePath && destinationFilePath && callback){
    
    var is = fs.createReadStream(sourceFilePath);
    var os = fs.createWriteStream(destinationFilePath);
    
    is.on("error", onError);
    os.on("error", onError);
    
    is.on("end",function(){
      os.end();
      callback();
    });

    is.pipe(os);
    
  }
}

/**
 * Gets JSON file content.
 *
 * This will verify that the file exists first.
 *
 * @method getJSONFileContent
 * @async
 * @param {String} filePath The path of the file to read
 * @param {Function} callback The function to call when done
 *   - **Error** The error if an error occurred, null otherwise 
 *   - **String** The file content or null if an error occurred 
 */
module.exports.getJSONFileContent = function(filePath, callback){

  // Check if file exists
  fs.exists(filePath, function(exists){

    if(exists){
      
      // Read file content
      fs.readFile(filePath, {encoding : "utf8"}, function(error, data){
        if(error){
          callback(error);
        }
        else{
          try{
            
            // Try to parse file data as JSON content
            var dataAsJson = JSON.parse(data);
            callback(null, dataAsJson);
            
          }
          catch(e){
            callback(new Error(e.message));
          }
        }
      }); 
    }
    else
      callback(new Error("Missing file " + filePath));

  });
  
}

/**
 * Removes a directory and all its content recursively
 * and asynchronously.
 *
 * It is assumed that the directory exists.
 *
 * @method rmdir
 * @async
 * @param {String} directoryPath The directory to remove
 * @param {Function} callback The function to call when done
 *   - **Error** The error if an error occurred, null otherwise 
 */
module.exports.rmdir = function(directoryPath, callback){
  var self = this;

  // Open directory
  fs.readdir(directoryPath, function(error, resources){
    var pendingResourceNumber = resources.length;
    
    // Failed reading directory
    if(error)
      return callback(error);

    // No more pending resources, done for this directory 
    if(!pendingResourceNumber){
      
      // Remove directory
      fs.rmdir(directoryPath, callback);
      
    }

    // Iterate through the list of resources in the directory
    resources.forEach(function(resource){
      
      var resourcePath = path.join(directoryPath, resource);

      // Get resource stats
      fs.stat(resourcePath, function(error, stats){
        if(error)
          return callback(error);

        // Resource correspond to a directory
        if(stats.isDirectory()){
          
          resources = self.rmdir(path.join(directoryPath, resource), function(error){
            if(error)
              return callback(error);
            
              pendingResourceNumber--;

              if(!pendingResourceNumber)
                fs.rmdir(directoryPath, callback);

          });

        }

        // Resource does not correspond to a directory
        // Mark resource as treated
        else{
          // Remove file
          fs.unlink(resourcePath, function(error){
            if(error)
              return callback(error);
            else{
              pendingResourceNumber--;

              if(!pendingResourceNumber)
                fs.rmdir(directoryPath, callback);

            }
          });

        }

      });

    });

  });
  
};