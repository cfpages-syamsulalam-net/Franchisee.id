/* Dropbar v1.0 - © Unlimited Elements for Elementor - Adarsh Pawar, Denys Odinstov */

function ueDropbar(dropbarId){ 
  
  var g_objDropbar = jQuery('#'+dropbarId);
  var g_objDropbarWrap;
  var g_isInEditor, g_showErrors, g_source;
  
  /**
  * empty element id option error handle
  */
  function emptyIdOptionErrorHandle(dataElementId){    
    if(g_isInEditor == 'no')
      return(false);
    
    if(dataElementId != '')
      return(false);
    
    if(g_showErrors == false)
      return(false);
    
    var errorMessageHtml =  '<div class="uc-editor-message uc-error">Dropbar Widget Error: Element Id option is empty. Please add Element Id to open it in Dropbar.</div>';
    
    //update dropbar html to show error message
    g_objDropbar.html(errorMessageHtml);    
  }
  
  /**
  * no element found on the page error handle
  */
  function noElementFoundErrorHandle(objDataElementId, dataElementId){    
    if(g_isInEditor == 'no')
      return(false);
    
    if(objDataElementId.length)
      return(false);
    
    if(g_showErrors == false)
      return(false);
    
    var errorMessageHtml = '<div class="uc-editor-message uc-error">Dropbar Widget Error: no Element found with id: "'+dataElementId+'"</div>';
    
    //update dropbar html to show error message
    g_objDropbar.html(errorMessageHtml);    
  }
  
  /**
  * click on trigger element
  */
  function onFoundElement(dataElementId){    
    if(g_isInEditor == 'no')
      return(false);
    
    if(g_showErrors == false)
      return(false);
    
    var objDropbarElement = jQuery('#'+dataElementId);
    
    if(!objDropbarElement.length)
      return(false);
    
    var successMessageHtml = '<div class="uc-editor-message uc-success">Element with id: "'+dataElementId+'" connected.</div> ';
    
    //update dropbar html to show error message
    g_objDropbar.append(successMessageHtml);    
  }
  
  /*
  * show | hide connected elements in editor
  */ 
  function hideSectionInEditor(objDataElementId){    
    if(g_isInEditor == 'no')
      return(false);
    
    var dataHideInEditor = g_objDropbar.data('hide-connected-elements');
    
    if(dataHideInEditor == true)
      objDataElementId.hide();
    
    if(dataHideInEditor == false)
      objDataElementId.css('display', '');    
  }
  
  /*
  * clone section
  */
  function findSectionsInEditor(objDataElementId){         
    var objClonedElement = objDataElementId.clone();
    
    //paste section
    g_objDropbarWrap.append(objClonedElement); 
  }
  
  /*
  * detach section
  */
  function findSectionsInFrontend(objDataElementId){         
    var objClonedElement = objDataElementId.detach();
    
    g_objDropbarWrap.append(objClonedElement);
  }
  
  /**
  * append element to dropbar
  */
  function appendElementToDropbar(objDataElementId, dataElementId){    
    if(g_isInEditor == 'yes'){
      
      //appends message in editor
      onFoundElement(dataElementId);
      
      //hides section in editor
      hideSectionInEditor(objDataElementId);
      
      //clones section
      findSectionsInEditor(objDataElementId);
    }
    
    //append dropbar element to dropbar
    if(g_isInEditor == 'no'){
      findSectionsInFrontend(objDataElementId)
    } 
  }
  
  /**
  * find dropbar element
  */
  function findDropbarElement(){    
    if(g_source != 'id')
      return(false);
    
    var dataElementId = g_objDropbar.data('element-id');
    
    //if in editor and element id option is not set, show error    
    emptyIdOptionErrorHandle(dataElementId);    
    
    //if in editor and element id object is not exist, show error    
    var objDataElementId = jQuery('#'+dataElementId);
    noElementFoundErrorHandle(objDataElementId, dataElementId);
    
    //detach element
    appendElementToDropbar(objDataElementId, dataElementId); 
  }
  
  function initDropbar(){
    //init vars
    g_objDropbarWrap = g_objDropbar.find('.ue-dropbar-content');
    g_isInEditor = g_objDropbar.data('editor');
    g_removeOrigin = g_objDropbar.data('remove-original');
    g_showErrors = g_objDropbar.data('show-errors');
    g_source = g_objDropbar.data('source');
    
    findDropbarElement();
  }
  
  initDropbar();
}