var resizeModule = (function(){


	function resizeContent(){
		var contentRatio = 1680/850;
		var windowHeight = $(window).innerHeight();
		var windowWidth = $(window).innerWidth();
		var windowRatio = windowWidth/windowHeight;
		var topMenuHeight = $('#topMenu').height();

		if (windowRatio > contentRatio){
			$('#content').height(Math.floor(windowHeight-topMenuHeight)+"px");
			$('#content').width(Math.floor(windowHeight*contentRatio)+"px");
		} else

		// if (windowWidth*1.5 < windowHeight){
		// 	console.log("Mobile Mode");
		// 	$("#middleColumn").insertBefore("#leftTeamColumn");
		// 	$('#leftTeamColumn').css('display','block');
		// }else

		{
			$('#content').width(Math.floor(windowWidth)+"px");
			$('#content').height((Math.floor(windowWidth/contentRatio)-topMenuHeight)+"px") ;
		}
		$('#content').css('font-size', $('#content').height()/8+'%');
	};


	resizeContent();

	$(window).resize(function(){
		resizeContent();

	});


})();