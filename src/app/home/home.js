angular.module( 'orderCloud' )

	.config( HomeConfig )
	.controller( 'HomeCtrl', HomeController )

;

function HomeConfig( $stateProvider ) {
	$stateProvider
		.state( 'home', {
			parent: 'base',
			url: '/home',
			templateUrl: 'home/templates/home.tpl.html',
			controller: 'HomeCtrl',
			controllerAs: 'home'
		})
		.state( 'storeprofile', {
			parent: 'base',
			url: '/storeprofile',
			templateUrl: 'home/templates/storeprofile.tpl.html',
			controller: 'HomeCtrl',
			controllerAs: 'home'
		})
}

function HomeController( ) {
	var vm = this;
}
