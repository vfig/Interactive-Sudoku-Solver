// From: http://www.rcbroughton.co.uk/sudoku/forum/viewtopic.php?f=3&t=434
// Choose 20 of the faster ones for running a quick comparison.
const HARD_KILLERS = [
  ['G<<L<K<L<^G>^>^E^^>^IJ<G^<G^>^^I^<>^HC<C^<B^N^^G^<>^>^^E^<DF<^PG^<>^^J<^^<H<<>^>^',
   '432851769786239415159467823263974581971583642548612397397148256614725938825396174'],
  ['G<<P<N<H<^N>^>^E^^>^GH<B^<K^>^^I^<>^IC<G^<C^L^^A^<>^>^^C^<EK<^KJ^<>^^I<^^<D<<>^>^',
   '149623875268957314537481296981534627423769158675812943812345769756198432394276581'],
  ['L<<Q<J<G<^N>^>^J^^>^C8<H^<F^>^^I^<>^FC<D^<I^L^^H^<>^>^^E^<AG<^PG^<>^^I<^^<G<<>^>^',
   '179836452456972318382514976791265834864193527523487691238651749947328165615749283'],
  ['N<<K<H<I<^I>^>^J^^>^CL<C^<L^>^^G^<>^9H<G^<C^J^^I^<>^>^^G^<IF<^LK^<>^^K<^^<7<<>^>^',
   '726389514835412976491675823247831659583967142169254738312798465678543291954126387'],
  ['A<H<MA<A<^P<<^N<<^E^E<^L<^E^^^^^^^^^M<<9<K<<<G^N<^F<SB^<^^L^^^^I<E>^>>^D^^^<^F<>^',
   '258976431394218576671354829836497215729165348145823967963782154582641793417539682'],
  ['E<8<ID<E<^N<<^L<<^A^Q<^K<^D^^^^^^^^^L<<G<I<<<K^C<^O<FB^<^^N^^^^M<C>^>>^K^^^<^B<>^',
   '285319476437586291169742835924657318578431962316298754893164527652873149741925683'],
  ['F<9<IF<K<^L<<^I<<^C^N<^N<^6^^^^^^^^^H<<I<I<<<9^K<^O<OA^<^^L^^^^R<F>^>>^G^^^<^6<>^',
   '547219638621483579893567124458736912716942385239158467162895743974321856385674291'],
  ['F<B<HB<K<^U<<^I<<^C^E<^I<^E^^^^^^^^^H<<G<M<<<C^R<^O<L6^<^^O^^^^K<A>^>>^F^^^<^B<>^',
   '296517483458632719371489256947251638182396547563748921619824375834975162725163894'],
  ['C<5<KD<I<^O<<^P<<^F^R<^C<^9^^^^^^^^^K<<H<I<<<A^X<^Q<IB^>^^I^^^^I<^>^>>^J^^6<^B<>^',
   '193287645257346189684951237916835472835472961742169853369714528528693714471528396'],
  ['C<9<L8<I<^P<<^L<<^C^J<^L<^E^^^^^^^^^N<<H<H<<<7^S<^J<PC^>^^G^^^^Q<^>^>>^G^^A<^9<>^',
   '268145379459387612371926458914573826587264931632891745145639287893712564726458193'],
  ['C<A<O7<G<^K<<^R<<^C^O<^G<^C^^^^^^^^^P<<B<M<<<B^V<^N<M8^>^^J^^^^J<^>^>>^F^^7<^C<>^',
   '916475238248139765753862149524987613637251894891346527379628451165794382482513976'],
  ['D<6<KH<C<^Q<<^P<<^E^M<^G<^9^^^^^^^^^H<<E<J<<<7^U<^Q<V8^>^^N^^^^K<^>^>>^C^^D<^5<>^',
   '725138946413965782968274531579346128284751369631829475192487653346512897857693214'],
  ['E<8<KF<F<^T<<^J<<^6^O<^F<^F^^^^^^^^^D<<E<R<<<A^W<^J<P9^>^^N^^^^N<^>^>>^E^^9<^7<>^',
   '247139685893456712165287439578943126416528397329671548782364951954712863631895274'],
  ['E<D<KA<H<^J<<^O<<^E^I<^J<^C^^^^^^^^^F<<K<M<<<B^X<^I<R9^>^^I^^^^K<^>^>>^F^^A<^7<>^',
   '286749135413256879579381624962437518147568293835192467398615742624873951751924386'],
  ['G<A<G6<M<^S<<^L<<^7^Q<^L<^7^^^^^^^^^J<<E<M<<<9^S<^J<T7^>^^J^^^^O<^>^>>^E^^9<^C<>^',
   '831954267576218439492736851349872516657143928218695743723581694964327185185469372'],
  ['I<A<E9<H<^Q<<^U<<^9^H<^F<^F^^^^^^^^^L<<I<G<<<9^S<^I<WC^>^^M^^^^O<^>^>>^9^^9<^7<>^',
   '631947285927815634845632197152463978463798512789521463214386759376259841598174326'],
  ['J<B<G9<G<^R<<^H<<^6^J<^R<^D^^^^^^^^^G<<E<O<<<9^T<^J<L9^>^^O^^^^N<^>^>>^F^^C<^A<>^',
   '896512743234786159157934826581249637473168592629375481342651978765893214918427365'],
  ['B<7<JF<B<^T<<^V<<^A^L<^R<^8^^^^^^^^^G<<M0^C<<AS>^OF<SB^^^^^^^^^H^<<^>>^E^<9<^8<>^',
   '735286941189435276462971583623718495547629318891354762274863159316597824958142637'],
  ['D<5<JE<H<^S<<^L<<^A^J<^M<^D^^^^^^^^^H<<N0^C<<CS>^KN<QD^^^^^^^^^9^<<^>>^A^<G<^9<>^',
   '462315978387694152951827634126473589845961723793258416538149267674532891219786345'],
  ['D<C<OF<C<^K<<^R<<^7^P<^N<^A^^^^^^^^^C<<N0^C<<DV>^EI<NF^^^^^^^^^E^<<^>>^I^<A<^7<>^',
   '259317864673584912418962753346295187921678345587431629835149276194726538762853491'],
];

const EXTREME_KILLERS = [
  'Wecoc #1',
  'Wecoc #1 mod A',
  'Wecoc #1 mod B',
  'Wecoc #2',
  'tarek unsolvable #41',
];

// See http://forum.enjoysudoku.com/human-solvable-zero-t33357.html for
// definition.
const HS_KILLERS = [
  ['3x3:d:k:3841:7705:7705:7705:7705:7705:26:3847:3847:3841:27:3846:3846:3846:7705:4361:3847:3848:3841:3843:4621:4876:28:4361:4361:4619:3848:29:3843:4621:4876:4876:5395:5395:4619:3848:3844:3843:4621:4114:4114:5395:4619:30:3850:3844:4878:4880:31:4114:3605:3605:3850:3850:3844:4878:4880:4880:4372:3350:3605:4632:32:4367:4878:33:4625:4372:3350:3350:4632:4632:4367:4367:4625:4625:4372:34:4375:4375:4375:',
   '875329146312674958469815372146298735253746819798153624687432591521987463934561287'],
  ['3x3:d:k:3587:14:15:16:17:18:19:3586:3586:3587:1543:1543:20:21:22:23:1544:24:25:26:3338:27:28:3337:3337:1544:29:30:31:3338:32:33:34:35:36:37:38:39:40:41:42:43:44:45:46:47:48:49:4365:4365:50:3596:51:52:53:1541:3339:3339:54:55:3596:56:57:58:1541:59:60:61:62:1542:1542:3585:3588:3588:63:64:65:66:67:68:3585:',
   '872314695615972843394586721569241387487635219231897564146758932723469158958123476'],
  ['3x3::k:3595:3595:3844:3844:3090:3336:3336:2575:2575:3595:4620:4620:3348:3090:5:5648:5648:2575:3350:4620:4620:3348:3090:23:5648:5648:3841:3350:2581:24:3348:25:26:27:2579:3841:28:2581:29:30:4625:4625:4625:2579:31:3843:2581:32:33:34:35:36:2579:3335:3843:4878:4878:37:38:39:4618:4618:3335:3341:4878:4878:40:41:42:4618:4618:3593:3341:3341:3334:3334:43:3842:3842:3593:3593:',
   '279648531581739426463251798956483217128975643734162859812597364697324185345816972'],
  ['3x3:d:k:18:4619:4619:4619:8451:3850:3850:3850:19:5388:5388:8451:8451:8451:8451:8451:6671:6671:5388:5388:3076:3076:8451:3333:3333:6671:6671:6414:6414:3076:3076:7937:3333:3333:5904:5904:6414:6414:7937:7937:7937:7937:7937:5904:5904:4109:4109:5382:5382:7937:5895:5895:5137:5137:4109:4109:5382:5382:8194:5895:5895:5137:5137:20:21:8194:8194:8194:8194:8194:22:23:24:4873:4873:4873:8194:4616:4616:4616:25:',
   '527938614439621578681574329872465193914387256365219487256893741793142865148756932'],
  ['3x3:d:k:7707:21:28:4880:4880:4880:29:30:5401:31:7707:3339:3339:5140:3338:3338:5401:32:33:3084:7707:5140:5140:5140:5401:3337:34:5137:3084:7707:7707:5140:2586:5401:3337:6158:5137:3858:3858:3352:3352:3352:2586:2586:6158:5137:3334:3858:3858:4631:4886:4886:3335:6158:35:3334:5139:4631:4631:4886:36:3335:6158:37:5139:3333:3333:4886:3336:3336:38:39:5139:40:41:6927:6927:6927:6927:42:43:',
   '934865127256714983187239465843651279519427638762398541475182396398546712621973854'],
  ['3x3:d:k:9730:9730:9730:9730:9:6150:9987:9987:9987:9730:10:11:12:13:6150:6150:6150:9987:9730:14:15:16:17:6150:18:19:9987:5895:5895:5895:5895:5895:20:6150:21:9987:5895:22:23:24:25:5640:26:8453:8453:9985:27:28:29:5640:30:31:8453:8453:9985:32:33:5640:5640:5640:34:8453:9220:9985:35:36:37:5640:38:39:8453:9220:9985:9985:9985:40:41:9220:9220:9220:9220:',
   '396721845571864239824395617183547926265983471947216583639472158712658394458139762'],
  ['3x3:d:k:6926:6926:6926:7697:7697:7697:6676:6676:6676:6926:6171:797:797:7697:2078:2078:7450:6676:6926:1564:6171:6171:7697:7450:7450:1311:6676:7952:1564:6171:6171:7701:7450:7450:1311:6674:7952:7952:7952:7701:7701:7701:6674:6674:6674:7952:4119:6409:6409:7701:6412:6412:3862:6674:6927:4119:6409:6409:6419:6412:6412:3862:6925:6927:6409:4119:4119:6419:3862:3862:6412:6925:6927:6927:6927:6419:6419:6419:6925:6925:6925:',
   '539827641682145397417396528754268139168739452923451786846572913371984265295613874'],
  ['3x3::k:4369:3849:3849:3849:4111:6918:6918:6918:3858:7434:4369:3849:5141:4111:4111:6918:3858:2841:7434:7434:4369:5141:5141:4111:3858:2841:2841:7434:5910:5910:26:5141:27:28:29:2841:3854:3854:5910:5910:30:31:32:3341:3341:2824:3854:3854:33:7192:34:3341:3341:6924:2824:2824:3860:3600:7192:7192:4371:6924:6924:2824:3860:6919:3600:3600:7192:4363:4371:6924:3860:6919:6919:6919:3600:4363:4363:4363:4371:',
   '621953784873264951954871623746132895198547362532698147215786439369415278487329516'],
  ['3x3:d:k:26:27:3585:3586:3587:3588:4360:5129:5642:28:3585:3586:3587:3588:4360:5129:5642:29:3585:3586:3587:3588:4360:5129:5642:30:31:32:3585:3586:3587:3588:4360:5129:5642:33:2578:2578:2578:34:35:36:4633:4633:4633:37:4632:7191:6934:4373:5396:5651:2577:38:39:40:4632:7191:6934:4373:5396:5651:2577:41:4632:7191:6934:4373:5396:5651:2577:42:4632:7191:6934:4373:43:5396:5651:2577:44:',
   '894637125725418369316259487952143678163872594478965231631784952589321746247596813'],
];

// 1 to 42 from: http://rcbroughton.co.uk/sudoku/forum/viewtopic.php?f=3&t=434#p2453
const TAREK_ALL = [
  'G<<L<K<L<^G>^>^E^^>^IJ<G^<G^>^^I^<>^HC<C^<B^N^^G^<>^>^^E^<DF<^PG^<>^^J<^^<H<<>^>^',
  'G<<M<L<M<^O>^>^C^^>^FF<G^<C^>^^H^<>^FE<E^<C^M^^H^<>^>^^E^<FH<^MH^<>^^L<^^<D<<>^>^',
  'G<<N<J<H<^O>^>^K^^>^GI<A^<L^>^^E^<>^FF<E^<C^I^^E^<>^>^^C^<GH<^QF^<>^^E<^^<J<<>^>^',
  'G<<P<N<H<^N>^>^E^^>^GH<B^<K^>^^I^<>^IC<G^<C^L^^A^<>^>^^C^<EK<^KJ^<>^^I<^^<D<<>^>^',
  'L<<H<N<L<^L>^>^D^^>^BJ<I^<I^>^^G^<>^FF<F^<C^H^^I^<>^>^^I^<FE<^MD^<>^^H<^^<G<<>^>^',
  'L<<Q<J<G<^N>^>^J^^>^C8<H^<F^>^^I^<>^FC<D^<I^L^^H^<>^>^^E^<AG<^PG^<>^^I<^^<G<<>^>^',
  'M<<L<O<F<^J>^>^H^^>^KE<C^<M^>^^I^<>^CC<C^<E^K^^I^<>^>^^E^<FA<^OH^<>^^J<^^<E<<>^>^',
  'N<<K<H<I<^I>^>^J^^>^CL<C^<L^>^^G^<>^9H<G^<C^J^^I^<>^>^^G^<IF<^LK^<>^^K<^^<7<<>^>^',
  'A<H<MA<A<^P<<^N<<^E^E<^L<^E^^^^^^^^^M<<9<K<<<G^N<^F<SB^<^^L^^^^I<E>^>>^D^^^<^F<>^',
  'E<8<ID<E<^N<<^L<<^A^Q<^K<^D^^^^^^^^^L<<G<I<<<K^C<^O<FB^<^^N^^^^M<C>^>>^K^^^<^B<>^',
  'F<9<IF<K<^L<<^I<<^C^N<^N<^6^^^^^^^^^H<<I<I<<<9^K<^O<OA^<^^L^^^^R<F>^>>^G^^^<^6<>^',
  'F<B<HB<K<^U<<^I<<^C^E<^I<^E^^^^^^^^^H<<G<M<<<C^R<^O<L6^<^^O^^^^K<A>^>>^F^^^<^B<>^',
  'C<5<KD<I<^O<<^P<<^F^R<^C<^9^^^^^^^^^K<<H<I<<<A^X<^Q<IB^>^^I^^^^I<^>^>>^J^^6<^B<>^',
  'C<9<L8<I<^P<<^L<<^C^J<^L<^E^^^^^^^^^N<<H<H<<<7^S<^J<PC^>^^G^^^^Q<^>^>>^G^^A<^9<>^',
  'C<A<O7<G<^K<<^R<<^C^O<^G<^C^^^^^^^^^P<<B<M<<<B^V<^N<M8^>^^J^^^^J<^>^>>^F^^7<^C<>^',
  'D<6<KH<C<^Q<<^P<<^E^M<^G<^9^^^^^^^^^H<<E<J<<<7^U<^Q<V8^>^^N^^^^K<^>^>>^C^^D<^5<>^',
  'E<8<KF<F<^T<<^J<<^6^O<^F<^F^^^^^^^^^D<<E<R<<<A^W<^J<P9^>^^N^^^^N<^>^>>^E^^9<^7<>^',
  'E<D<KA<H<^J<<^O<<^E^I<^J<^C^^^^^^^^^F<<K<M<<<B^X<^I<R9^>^^I^^^^K<^>^>>^F^^A<^7<>^',
  'G<A<G6<M<^S<<^L<<^7^Q<^L<^7^^^^^^^^^J<<E<M<<<9^S<^J<T7^>^^J^^^^O<^>^>>^E^^9<^C<>^',
  'I<A<E9<H<^Q<<^U<<^9^H<^F<^F^^^^^^^^^L<<I<G<<<9^S<^I<WC^>^^M^^^^O<^>^>>^9^^9<^7<>^',
  'J<B<G9<G<^R<<^H<<^6^J<^R<^D^^^^^^^^^G<<E<O<<<9^T<^J<L9^>^^O^^^^N<^>^>>^F^^C<^A<>^',
  'B<7<JF<B<^T<<^V<<^A^L<^R<^8^^^^^^^^^G<<M0^C<<AS>^OF<SB^^^^^^^^^H^<<^>>^E^<9<^8<>^',
  'D<5<JE<H<^S<<^L<<^A^J<^M<^D^^^^^^^^^H<<N0^C<<CS>^KN<QD^^^^^^^^^9^<<^>>^A^<G<^9<>^',
  'D<C<OF<C<^K<<^R<<^7^P<^N<^A^^^^^^^^^C<<N0^C<<DV>^EI<NF^^^^^^^^^E^<<^>>^I^<A<^7<>^',
  'D<D<IB<9<^N<<^R<<^D^K<^S<^D^^^^^^^^^E<<N0^C<<6R>^KN<MD^^^^^^^^^F^<<^>>^G^<D<^6<>^',
  'H<B<J8<C<^K<<^U<<^7^K<^Q<^G^^^^^^^^^K<<N0^C<<6P>^OM<PB^^^^^^^^^M^<<^>>^9^<9<^9<>^',
  'D<A<GD<I<^S<<^H<<^B^P<^D<^B^^^^^^^F^E<N<<<<^<7^O<KO<NB^F^^^^^^^G^<<^>>^F^<D<^A<>^',
  'D<A<MC<D<^N<<^M<<^A^N<^F<^E^^^^^^^C^G<N<<<<^<7^K<MR<LA^F^^^^^^^L^<<^>>^E^<B<^9<>^',
  'G<9<M9<I<^T<<^J<<^A^G<^G<^9^^^^^^^E^E<T<<<<^<A^M<JK<OD^H^^^^^^^G^<<^>>^E^<9<^B<>^',
  'K<B<GA<A<^Q<<^M<<^8^G<^L<^B^^^^^^^G^E<P<<<<^<7^K<PO<I8^M^^^^^^^E^<<^>>^K^<A<^B<>^',
  'C<C<9C<I<^J<<^O<<^B^R<^Y<^A^^^^>^^^^P<<C<^9<<B^R<^M<QB^>^^L^^^^K<^>^>>^F^^A<^8<>^',
  'C<5<ED<H<^R<<^K<<^C^N<^J<^8^^^^P^^N^I<<>^<>^<B^O<^F<Q9^G^^F^^^^E^<<^>>^I^<D<^8<>^',
  'D<B<EE<B<^R<<^G<<^B^G<^J<^H^^^^P^^I^N<<>^<>^<B^J<^M<R8^I^^D^^^^H^<<^>>^D^<B<^B<>^',
  'E<9<D9<K<^P<<^G<<^C^K<^N<^9^^^^K^^P^K<<>^<>^<7^O<^L<K8^K^^I^^^^E^<<^>>^F^<E<^9<>^',
  'H<A<DE<B<^P<<^N<<^A^L<^F<^B^^^^J^^K^P<<>^<>^<9^L<^L<VC^F^^I^^^^C^<<^>>^F^<E<^3<>^',
  'RJJDEPGD<H```````^F````D```D``````9`L````HE``L`L`SJ```C```I````A``B`````^<```````',
  'ORH9GOCG<I```````^I````N```8``````9`I````DA``K`O`OL```C```L````I``3`````^<```````',
  'KNLDDMBC<M```````^J````L```A``````F`I````JF``D`I`IP```E```D````I``C`````^<```````',
  'QQH7IGID<H```````^N````O```8``````8`F````LG``M`S`IG```E```D````D``8`````^<```````',
  'H<S<<K<<LO^<<^<^>^^<R<<<Y^F^O^V>>^^^>^K^<<^>^^P^<<^S^M^^^>>>^>^>^IM<T<<^^>^<^<<^<',
  'S<J<<O<<KJ^<<^<^>^^<N<<<J^Q^S^O>>^^^>^W^<<^>^^O^<<^T^J^^^>>>^>^>^ML<S<<^^>^<^<<^<',
  'M<S<<H<<OM^<<^<^>^^<O<<<N^R^K^X>>^^^>^I^<<^>^^P^<<^I^N^^^>>>^>^>^RU<O<<^^>^<^<<^<',
];
